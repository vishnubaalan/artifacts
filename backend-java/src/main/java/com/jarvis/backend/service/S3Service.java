package com.jarvis.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jarvis.backend.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import java.io.OutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@Slf4j
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final ObjectMapper objectMapper;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.cloudfront.domain}")
    private String cloudfrontDomain;

    @Value("${aws.region}")
    private String region;

    @Value("${app.always-use-cloudfront:false}")
    private boolean alwaysUseCloudfront;

    // Direct translation of Node.js simple memory cache
    private static class CacheEntry {
        Object data;
        long timestamp;
    }

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long TTL = 5000; // 5 seconds

    public S3Service(S3Client s3Client, S3Presigner s3Presigner, ObjectMapper objectMapper) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.objectMapper = objectMapper;
    }

    private void invalidateCache() {
        cache.clear();
    }

    private <T> T getFromCache(String key) {
        CacheEntry entry = cache.get(key);
        if (entry != null && (System.currentTimeMillis() - entry.timestamp < TTL)) {
            return (T) entry.data;
        }
        return null;
    }

    private void putToCache(String key, Object data) {
        CacheEntry entry = new CacheEntry();
        entry.data = data;
        entry.timestamp = System.currentTimeMillis();
        cache.put(key, entry);
    }

    // --- Presigned URL ---
    public PresignedUrlResponse generatePresignedUrl(String key, String contentType) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .putObjectRequest(objectRequest)
                .build();

        String url = s3Presigner.presignPutObject(presignRequest).url().toString();
        return PresignedUrlResponse.builder().url(url).key(key).build();
    }

    // --- Direct Upload ---
    public UploadResponse uploadFile(String fileName, String contentType, byte[] content) {
        PutObjectRequest putOb = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .contentType(contentType)
                .build();

        s3Client.putObject(putOb, RequestBody.fromBytes(content));
        invalidateCache();

        String location = (cloudfrontDomain != null && !cloudfrontDomain.isEmpty())
                ? "https://" + cloudfrontDomain + "/" + fileName
                : "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + fileName;

        return UploadResponse.builder()
                .success(true)
                .key(fileName)
                .location(location)
                .build();
    }

    // --- Get File URL ---
    public String getFileUrl(String key, boolean isPublic, boolean download) {
        if (!download && (isPublic || alwaysUseCloudfront) && cloudfrontDomain != null && !cloudfrontDomain.isEmpty()) {
            return "https://" + cloudfrontDomain + "/" + key;
        }

        GetObjectRequest.Builder getObjectBuilder = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key);

        if (download) {
            String fileName = key.substring(key.lastIndexOf('/') + 1);
            getObjectBuilder.responseContentDisposition("attachment; filename=\"" + fileName + "\"");
        }

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .getObjectRequest(getObjectBuilder.build())
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    // --- List Files ---
    public FileListResponse listFiles(String prefix, int limit, String continuationToken, boolean recursive) {
        // Node logic:
        // if recursive: Delimiter = undefined
        // if not recursive: Delimiter = "/"

        ListObjectsV2Request.Builder requestBuilder = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .maxKeys(limit)
                .continuationToken(continuationToken);

        if (!recursive) {
            requestBuilder.delimiter("/");
        }

        log.info("[S3Service] Listing files - prefix: \"{}\", limit: {}, recursive: {}", prefix, limit, recursive);
        ListObjectsV2Response response = s3Client.listObjectsV2(requestBuilder.build());

        List<FileItem> folders = new ArrayList<>();
        if (!recursive) {
            folders = response.commonPrefixes().stream()
                    .filter(p -> (prefix.length() > 0 || !p.prefix().equals("trash/"))
                            && !p.prefix().contains(".metadata/"))
                    .map(p -> {
                        String[] parts = p.prefix().split("/");
                        String name = parts.length > 0 ? parts[parts.length - 1] : "";
                        return FileItem.builder()
                                .key(p.prefix())
                                .name(name)
                                .isFolder(true)
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        List<FileItem> processedItems = response.contents().stream()
                .filter(c -> !c.key().equals(prefix)) // Filter out self key matches if any
                .filter(c -> !c.key().startsWith(".metadata/"))
                .filter(c -> prefix.startsWith("trash/") || !c.key().startsWith("trash/"))
                .map(c -> {
                    boolean isFolder = c.key().endsWith("/");
                    String[] parts = c.key().split("/");
                    String name = parts.length > 0 ? parts[parts.length - 1] : "";

                    String url = (!isFolder && cloudfrontDomain != null && !cloudfrontDomain.isEmpty())
                            ? "https://" + cloudfrontDomain + "/" + c.key()
                            : null;

                    return FileItem.builder()
                            .key(c.key())
                            .name(name)
                            .size(c.size())
                            .lastModified(c.lastModified())
                            .isFolder(isFolder)
                            .url(url)
                            .build();
                })
                .collect(Collectors.toList());

        List<FileItem> finalItems;
        if (recursive) {
            finalItems = processedItems;
        } else {
            // Flat view logic from Node
            List<FileItem> files = processedItems.stream().filter(i -> !Boolean.TRUE.equals(i.getIsFolder()))
                    .collect(Collectors.toList());
            finalItems = new ArrayList<>(folders);
            finalItems.addAll(files);
        }

        return FileListResponse.builder()
                .items(finalItems)
                .nextContinuationToken(response.nextContinuationToken())
                .isTruncated(response.isTruncated())
                .build();
    }

    // --- Delete File/Folder ---
    public void deleteFile(String key) {
        boolean isFolder = key.endsWith("/");

        if (isFolder) {
            log.info("[S3Service] Deleting folder and contents: {}", key);
            // List all objects recursively
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(key)
                    .build();

            ListObjectsV2Response listRes = s3Client.listObjectsV2(listReq);

            if (listRes.hasContents()) {
                List<ObjectIdentifier> objects = listRes.contents().stream()
                        .map(c -> ObjectIdentifier.builder().key(c.key()).build())
                        .collect(Collectors.toList());

                s3Client.deleteObjects(DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(Delete.builder().objects(objects).build())
                        .build());

                log.info("[S3Service] Deleted {} objects from folder {}", objects.size(), key);
            }

            // The folder object itself would be in the contents if it exists.
            // Node code does explicit deletion of key at end.
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());

        } else {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
        }
        invalidateCache();
    }

    public void bulkDelete(List<String> keys) {
        if (keys == null || keys.isEmpty())
            return;

        log.info("[S3Service] Bulk deleting {} items", keys.size());

        // S3 deleteObjects supports up to 1000 items per call
        // For simplicity in this scale, we assume keys < 1000 or handle in batches
        // I'll implement batching for safety
        for (int i = 0; i < keys.size(); i += 1000) {
            List<String> batch = keys.subList(i, Math.min(i + 1000, keys.size()));
            List<ObjectIdentifier> objects = batch.stream()
                    .map(key -> ObjectIdentifier.builder().key(key).build())
                    .collect(Collectors.toList());

            s3Client.deleteObjects(DeleteObjectsRequest.builder()
                    .bucket(bucketName)
                    .delete(Delete.builder().objects(objects).build())
                    .build());
        }

        invalidateCache();
    }

    // --- Create Folder ---
    public void createFolder(String folderName) {
        String key = folderName.endsWith("/") ? folderName : folderName + "/";
        s3Client.putObject(PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build(), RequestBody.empty());
    }

    // --- Move To Trash ---
    public void moveToTrash(String key) {
        boolean isTruncated = true;
        String continuationToken = null;

        while (isTruncated) {
            ListObjectsV2Request req = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(key)
                    .continuationToken(continuationToken)
                    .build();

            ListObjectsV2Response res = s3Client.listObjectsV2(req);

            for (S3Object obj : res.contents()) {
                String trashKey = "trash/" + obj.key();

                // Copy
                CopyObjectRequest copyReq = CopyObjectRequest.builder()
                        .sourceBucket(bucketName)
                        .sourceKey(obj.key())
                        .destinationBucket(bucketName)
                        .destinationKey(trashKey)
                        .build();
                s3Client.copyObject(copyReq);
            }

            isTruncated = res.isTruncated();
            continuationToken = res.nextContinuationToken();
        }

        deleteFile(key); // This re-lists and deletes. slightly inefficient but matches Node logic
                         // calling `deleteFile`.
        invalidateCache();
    }

    // --- Restore File ---
    public void restoreFile(String key) {
        if (!key.startsWith("trash/")) {
            throw new RuntimeException("Item is not in trash");
        }

        boolean isTruncated = true;
        String continuationToken = null;

        while (isTruncated) {
            ListObjectsV2Request req = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(key)
                    .continuationToken(continuationToken)
                    .build();

            ListObjectsV2Response res = s3Client.listObjectsV2(req);

            for (S3Object obj : res.contents()) {
                String originalKey = obj.key().substring("trash/".length());

                CopyObjectRequest copyReq = CopyObjectRequest.builder()
                        .sourceBucket(bucketName)
                        .sourceKey(obj.key())
                        .destinationBucket(bucketName)
                        .destinationKey(originalKey)
                        .build();
                s3Client.copyObject(copyReq);
            }

            isTruncated = res.isTruncated();
            continuationToken = res.nextContinuationToken();
        }

        deleteFile(key);
        invalidateCache();
    }

    // --- Recent Activity ---
    public List<FileItem> getRecentActivity(int limit) {
        try {
            List<FileItem> cached = getFromCache("activity");
            if (cached != null)
                return cached;

            ListObjectsV2Response res = s3Client.listObjectsV2(ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .maxKeys(1000)
                    .build());

            List<FileItem> items = res.contents().stream()
                    .filter(c -> !c.key().endsWith("/")) // filter folders
                    .map(c -> {
                        String[] parts = c.key().split("/");
                        String name = parts.length > 0 ? parts[parts.length - 1] : "";
                        return FileItem.builder()
                                .key(c.key())
                                .name(name)
                                .size(c.size())
                                .lastModified(c.lastModified())
                                .build();
                    })
                    .sorted((a, b) -> {
                        if (a.getLastModified() == null || b.getLastModified() == null)
                            return 0;
                        return b.getLastModified().compareTo(a.getLastModified());
                    })
                    .limit(limit)
                    .collect(Collectors.toList());

            putToCache("activity", items);
            return items;
        } catch (Exception e) {
            log.error("[S3Service] Error fetching recent activity", e);
            throw e;
        }
    }

    // --- Storage Usage ---
    public Map<String, Object> getStorageUsage() {
        try {
            Map<String, Object> cached = getFromCache("stats");
            if (cached != null)
                return cached;

            log.info("[S3Service] Calculating storage usage for bucket: {}", bucketName);
            long totalSize = 0;
            int fileCount = 0;
            int folderCount = 0;
            long images = 0, documents = 0, videos = 0, others = 0;

            boolean isTruncated = true;
            String continuationToken = null;

            while (isTruncated) {
                ListObjectsV2Request req = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .continuationToken(continuationToken)
                        .build();

                ListObjectsV2Response res = s3Client.listObjectsV2(req);
                if (res.contents() == null)
                    break;

                for (S3Object obj : res.contents()) {
                    if (obj.key().endsWith("/")) {
                        folderCount++;
                    } else {
                        fileCount++;
                        long size = obj.size() != null ? obj.size() : 0;
                        totalSize += size;

                        String ext = "";
                        int lastDot = obj.key().lastIndexOf('.');
                        if (lastDot > 0)
                            ext = obj.key().substring(lastDot + 1).toLowerCase();

                        if (Arrays.asList("jpg", "jpeg", "png", "gif", "svg", "webp").contains(ext))
                            images += size;
                        else if (Arrays.asList("pdf", "doc", "docx", "txt", "csv", "xlsx", "pptx").contains(ext))
                            documents += size;
                        else if (Arrays.asList("mp4", "mov", "avi", "mkv", "webm").contains(ext))
                            videos += size;
                        else
                            others += size;
                    }
                }
                isTruncated = res.isTruncated() != null ? res.isTruncated() : false;
                continuationToken = res.nextContinuationToken();
            }

            final long finalTotal = totalSize;
            List<Map<String, Object>> breakdown = new ArrayList<>();
            breakdown.add(createBreakdownItem("Images", getPercent(images, finalTotal), "#3b82f6"));
            breakdown.add(createBreakdownItem("Documents", getPercent(documents, finalTotal), "#8b5cf6"));
            breakdown.add(createBreakdownItem("Videos", getPercent(videos, finalTotal), "#ec4899"));
            breakdown.add(createBreakdownItem("Others", getPercent(others, finalTotal), "#94a3b8"));

            Map<String, Object> result = new HashMap<>();
            result.put("totalBytes", totalSize);
            result.put("fileCount", fileCount);
            result.put("folderCount", folderCount);
            result.put("breakdown", breakdown);
            result.put("quotaBytes", 1024L * 1024 * 1024); // 1GB

            putToCache("stats", result);
            return result;
        } catch (Exception e) {
            log.error("[S3Service] Error calculating storage usage", e);
            throw e;
        }
    }

    private Map<String, Object> createBreakdownItem(String label, int percent, String color) {
        Map<String, Object> item = new HashMap<>();
        item.put("label", label);
        item.put("percent", percent);
        item.put("color", color);
        return item;
    }

    private int getPercent(long bytes, long total) {
        if (total <= 0)
            return 0;
        return (int) Math.round(((double) bytes / total) * 100);
    }

    // --- Starred Keys ---
    public List<String> getStarredKeys() {
        try {
            ResponseBytes<GetObjectResponse> bytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(".metadata/stars.json")
                    .build());
            String json = bytes.asString(StandardCharsets.UTF_8);
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (NoSuchKeyException | IOException e) {
            return new ArrayList<>();
        }
    }

    public List<String> toggleStar(String key) {
        List<String> stars = new ArrayList<>(getStarredKeys());
        if (stars.contains(key)) {
            stars.remove(key);
        } else {
            stars.add(key);
        }

        try {
            String json = objectMapper.writeValueAsString(stars);
            s3Client.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(".metadata/stars.json")
                    .contentType("application/json")
                    .build(), RequestBody.fromString(json));
        } catch (Exception e) {
            throw new RuntimeException("Failed to update stars", e);
        }
        return stars;
    }

    // --- Sharing ---
    public Map<String, SharingSettings> getSharingData() {
        // Check cache
        Map<String, SharingSettings> cached = getFromCache("sharing");
        if (cached != null)
            return cached;

        try {
            ResponseBytes<GetObjectResponse> bytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(".metadata/sharing.json")
                    .build());
            String json = bytes.asString(StandardCharsets.UTF_8);
            Map<String, SharingSettings> data = objectMapper.readValue(json,
                    new TypeReference<Map<String, SharingSettings>>() {
                    });
            putToCache("sharing", data);
            return data;
        } catch (NoSuchKeyException e) {
            return new HashMap<>();
        } catch (IOException e) {
            log.error("Error getting sharing data", e);
            return new HashMap<>();
        }
    }

    public SharingSettings updateSharing(String key, SharingSettings settings) {
        Map<String, SharingSettings> allSharing = new HashMap<>(getSharingData());

        // Merge existing with new
        SharingSettings existing = allSharing.get(key);
        if (existing == null) {
            existing = SharingSettings.builder()
                    .generalAccess("restricted")
                    .sharedWith(new ArrayList<>())
                    .build();
        }

        if (settings.getSharedWith() != null) {
            existing.setSharedWith(settings.getSharedWith());
        }
        if (settings.getGeneralAccess() != null) {
            existing.setGeneralAccess(settings.getGeneralAccess());
        }
        if (settings.getGeneralRole() != null) {
            existing.setGeneralRole(settings.getGeneralRole());
        }
        existing.setUpdatedAt(Instant.now().toString());

        allSharing.put(key, existing);

        try {
            String json = objectMapper.writeValueAsString(allSharing);
            s3Client.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(".metadata/sharing.json")
                    .contentType("application/json")
                    .build(), RequestBody.fromString(json));

            invalidateCache(); // Simple invalidation
            return existing;
        } catch (IOException e) {
            throw new RuntimeException("Failed to update sharing", e);
        }
    }

    public SharingSettings getFileSharing(String key) {
        Map<String, SharingSettings> allSharing = getSharingData();
        return allSharing.getOrDefault(key, SharingSettings.builder()
                .generalAccess("restricted")
                .sharedWith(new ArrayList<>())
                .build());
    }

    // --- Short Links ---
    public Map<String, ShareLink> getShareLinks() {
        Map<String, ShareLink> cached = getFromCache("shareLinks");
        if (cached != null)
            return cached;

        try {
            ResponseBytes<GetObjectResponse> bytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(".metadata/links.json")
                    .build());
            String json = bytes.asString(StandardCharsets.UTF_8);
            if (json == null || json.trim().isEmpty()) {
                return new HashMap<>();
            }
            Map<String, ShareLink> data = objectMapper.readValue(json,
                    new TypeReference<Map<String, ShareLink>>() {
                    });
            putToCache("shareLinks", data);
            return data;
        } catch (NoSuchKeyException e) {
            log.info("Metadata file .metadata/links.json not found, starting fresh.");
            return new HashMap<>();
        } catch (Exception e) {
            log.error("Error retrieving share links metadata", e);
            return new HashMap<>();
        }
    }

    public ShareLink createShortLink(String key) {
        if (key == null)
            return null;

        Map<String, ShareLink> allLinks = new HashMap<>(getShareLinks());

        // Find existing for this key
        Optional<ShareLink> existing = allLinks.values().stream()
                .filter(l -> key.equals(l.getKey()))
                .findFirst();

        if (existing.isPresent())
            return existing.get();

        // Create new
        String id = UUID.randomUUID().toString().substring(0, 8);
        ShareLink link = ShareLink.builder()
                .id(id)
                .key(key)
                .createdAt(Instant.now().toString())
                .build();

        allLinks.put(id, link);

        try {
            String json = objectMapper.writeValueAsString(allLinks);
            s3Client.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(".metadata/links.json")
                    .contentType("application/json")
                    .build(), RequestBody.fromString(json));

            invalidateCache();
            return link;
        } catch (Exception e) {
            log.error("CRITICAL: Failed to save short link metadata to S3 for key: {}", key, e);
            throw new RuntimeException("Failed to save share link: " + e.getMessage(), e);
        }
    }

    public ShareLink getLinkById(String id) {
        return getShareLinks().get(id);
    }

    /**
     * Downloads a folder as a ZIP stream
     */
    public void downloadFolder(String prefix, OutputStream os) throws IOException {
        String finalPrefix = prefix.endsWith("/") ? prefix : prefix + "/";

        try (ZipOutputStream zos = new ZipOutputStream(os)) {
            String continuationToken = null;
            boolean isTruncated = true;

            while (isTruncated) {
                ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .prefix(finalPrefix)
                        .continuationToken(continuationToken)
                        .build();

                ListObjectsV2Response listRes = s3Client.listObjectsV2(listReq);

                for (S3Object obj : listRes.contents()) {
                    if (obj.key().endsWith("/")) {
                        continue; // Skip folder markers
                    }

                    // Get relative path for ZIP entry
                    String relativePath = obj.key().substring(finalPrefix.length());

                    ZipEntry zipEntry = new ZipEntry(relativePath);
                    zos.putNextEntry(zipEntry);

                    GetObjectRequest getReq = GetObjectRequest.builder()
                            .bucket(bucketName)
                            .key(obj.key())
                            .build();

                    // Stream from S3 to ZIP
                    try (var s3Stream = s3Client.getObject(getReq)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = s3Stream.read(buffer)) > 0) {
                            zos.write(buffer, 0, len);
                        }
                    }
                    zos.closeEntry();
                }

                isTruncated = listRes.isTruncated();
                continuationToken = listRes.nextContinuationToken();
            }
            zos.finish();
        }
    }
}
