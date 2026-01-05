package com.jarvis.backend.controller;

import com.jarvis.backend.dto.*;
import com.jarvis.backend.service.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.HandlerMapping;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/s3")
@RequiredArgsConstructor
@Slf4j
public class S3Controller {

    private final S3Service s3Service;

    @PostMapping("/direct-upload")
    public ResponseEntity<ApiResponse<UploadResponse>> directUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "prefix", required = false) String prefix) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.<UploadResponse>builder()
                    .success(false).message("No file uploaded").build());
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null)
            originalName = "unnamed_file";

        String key = (prefix != null && !prefix.isEmpty()) ? prefix + originalName : originalName;

        UploadResponse result = s3Service.uploadFile(key, file.getContentType(), file.getBytes());
        return ResponseEntity.ok(ApiResponse.<UploadResponse>builder().success(true).data(result).build());
    }

    @PostMapping("/upload-url")
    public ResponseEntity<ApiResponse<PresignedUrlResponse>> getUploadUrl(@RequestBody PresignedUrlRequest request) {
        PresignedUrlResponse res = s3Service.generatePresignedUrl(request.getFileName(), request.getContentType());
        return ResponseEntity.ok(ApiResponse.<PresignedUrlResponse>builder().success(true).data(res).build());
    }

    @GetMapping("/file-url/{*key}")
    public ResponseEntity<ApiResponse<Object>> getFileUrl(
            @PathVariable(value = "key", required = false) String key,
            @RequestParam(value = "key", required = false) String keyParam,
            @RequestParam(value = "isPublic", defaultValue = "false") boolean isPublic,
            @RequestParam(value = "download", defaultValue = "false") boolean download,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {

        try {
            String finalKey = (key != null && !key.isEmpty()) ? key : keyParam;
            if (finalKey != null && finalKey.startsWith("/")) {
                finalKey = finalKey.substring(1);
            }

            if (finalKey == null || finalKey.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.builder().success(false).message("Key is required").build());
            }

            // Simple Permission Check
            SharingSettings sharing = s3Service.getFileSharing(finalKey);
            boolean hasAccess = false;

            if ("public".equals(sharing.getGeneralAccess())) {
                hasAccess = true;
            } else if (userEmail != null) {
                // Check if user is in shared list or is owner (mocking owner for now)
                if ("owner@example.com".equals(userEmail)) {
                    hasAccess = true;
                } else {
                    hasAccess = sharing.getSharedWith().stream()
                            .anyMatch(u -> u.getEmail().equalsIgnoreCase(userEmail));
                }
            } else {
                // If no email, only allow if we are generating a public URL for the first time
                // by owner
                // In this demo, we'll allow the owner to generate it without header for
                // simplicity in UI,
                // but real apps would enforce auth here.
                hasAccess = true;
            }

            if (!hasAccess) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.builder().success(false).message("Access Denied").build());
            }

            String url = s3Service.getFileUrl(finalKey, isPublic, download);
            return ResponseEntity.ok(ApiResponse.builder().success(true).data(java.util.Map.of("url", url)).build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.builder().success(false).message(e.getMessage()).build());
        }
    }

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<Object>> listFiles(
            @RequestParam(value = "prefix", defaultValue = "") String prefix,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestParam(value = "continuationToken", required = false) String continuationToken,
            @RequestParam(value = "recursive", defaultValue = "false") boolean recursive,
            @RequestParam(value = "viewType", required = false) String viewType) {

        int finalLimit = (limit != null) ? limit : 100;

        if ("recent".equals(viewType)) {
            List<FileItem> recentItems = s3Service.getRecentActivity(limit != null ? limit : 20);
            FileListResponse res = FileListResponse.builder()
                    .items(recentItems)
                    .nextContinuationToken(null)
                    .isTruncated(false)
                    .build();
            return ResponseEntity.ok(ApiResponse.builder().success(true).data(res).build());
        }

        if ("starred".equals(viewType)) {
            List<String> starredKeys = s3Service.getStarredKeys();
            // Fetch ALL (recursive) to filter in memory - replicating Node approach
            FileListResponse allRes = s3Service.listFiles("", 10000, null, true);

            List<FileItem> filtered = allRes.getItems().stream()
                    .filter(item -> starredKeys.contains(item.getKey()))
                    .collect(Collectors.toList());

            FileListResponse res = FileListResponse.builder()
                    .items(filtered)
                    .nextContinuationToken(null) // No pagination for starred
                    .isTruncated(false)
                    .build();
            return ResponseEntity.ok(ApiResponse.builder().success(true).data(res).build());
        }

        if ("shared".equals(viewType)) {
            // Get all sharing data
            Map<String, SharingSettings> sharingData = s3Service.getSharingData();
            // Get all files
            FileListResponse allRes = s3Service.listFiles("", 10000, null, true);

            // Filter files that have sharing settings (either public or shared with
            // someone)
            List<FileItem> filtered = allRes.getItems().stream()
                    .filter(item -> {
                        SharingSettings settings = sharingData.get(item.getKey());
                        if (settings == null)
                            return false;
                        boolean isPublic = "public".equals(settings.getGeneralAccess());
                        boolean isSharedWithOthers = settings.getSharedWith() != null
                                && !settings.getSharedWith().isEmpty();
                        return isPublic || isSharedWithOthers;
                    })
                    .collect(Collectors.toList());

            FileListResponse res = FileListResponse.builder()
                    .items(filtered)
                    .nextContinuationToken(null)
                    .isTruncated(false)
                    .build();
            return ResponseEntity.ok(ApiResponse.builder().success(true).data(res).build());
        }

        // Standard list
        FileListResponse res = s3Service.listFiles(prefix, finalLimit, continuationToken, recursive);
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(res).build());
    }

    @DeleteMapping("/files/**")
    public ResponseEntity<ApiResponse<String>> deleteFile(HttpServletRequest request) {
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String key = path.substring("/api/s3/files/".length());

        s3Service.deleteFile(key);
        return ResponseEntity
                .ok(ApiResponse.<String>builder().success(true).message("File deleted successfully").build());
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Object>> bulkDelete(@RequestBody List<String> keys) {
        s3Service.bulkDelete(keys);
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Items deleted successfully").build());
    }

    @PostMapping("/create-folder")
    public ResponseEntity<ApiResponse<Object>> createFolder(@RequestBody CreateFolderRequest request) {
        s3Service.createFolder(request.getFolderName());
        // Node returns: { success: true, data: { success: true, key: ... } } ??
        // Check Node: return res.json({ success: true, data: result }); where result is
        // { success: true, key }
        // So data: { success: true, key }
        String finalKey = request.getFolderName().endsWith("/") ? request.getFolderName()
                : request.getFolderName() + "/";
        return ResponseEntity.ok(ApiResponse.builder().success(true)
                .data(java.util.Map.of("success", true, "key", finalKey)).build());
    }

    @PostMapping("/move-to-trash")
    public ResponseEntity<ApiResponse<Object>> moveToTrash(@RequestBody KeyRequest request) {
        s3Service.moveToTrash(request.getKey());
        // Node: result = { success:true, trashKey }
        return ResponseEntity.ok(ApiResponse.builder().success(true)
                .data(java.util.Map.of("success", true, "trashKey", "trash/" + request.getKey())).build());
    }

    @PostMapping("/restore")
    public ResponseEntity<ApiResponse<Object>> restore(@RequestBody KeyRequest request) {
        s3Service.restoreFile(request.getKey());
        // result = { success:true, originalKey: ... }
        String originalKey = request.getKey().substring("trash/".length());
        return ResponseEntity.ok(ApiResponse.builder().success(true)
                .data(java.util.Map.of("success", true, "originalKey", originalKey)).build());
    }

    @GetMapping("/starred-keys")
    public ResponseEntity<ApiResponse<List<String>>> getStarredKeys() {
        return ResponseEntity.ok(ApiResponse.<List<String>>builder()
                .success(true).data(s3Service.getStarredKeys()).build());
    }

    @PostMapping("/toggle-star")
    public ResponseEntity<ApiResponse<List<String>>> toggleStar(@RequestBody KeyRequest request) {
        return ResponseEntity.ok(ApiResponse.<List<String>>builder()
                .success(true).data(s3Service.toggleStar(request.getKey())).build());
    }

    @GetMapping("/share/{*key}")
    public ResponseEntity<ApiResponse<SharingSettings>> getSharing(
            @PathVariable(value = "key", required = false) String key,
            @RequestParam(value = "key", required = false) String keyParam) {

        String finalKey = (key != null && !key.isEmpty()) ? key : keyParam;
        if (finalKey != null && finalKey.startsWith("/")) {
            finalKey = finalKey.substring(1);
        }

        return ResponseEntity.ok(ApiResponse.<SharingSettings>builder()
                .success(true).data(s3Service.getFileSharing(finalKey)).build());
    }

    @PostMapping("/share")
    public ResponseEntity<ApiResponse<SharingSettings>> updateSharing(@RequestBody ShareRequest request) {
        SharingSettings settings = SharingSettings.builder()
                .sharedWith(request.getSharedWith())
                .generalAccess(request.getGeneralAccess() != null ? request.getGeneralAccess()
                        : request.getAccess() != null ? request.getAccess() : "restricted")
                .generalRole(request.getGeneralRole() != null ? request.getGeneralRole() : "viewer")
                .build();
        return ResponseEntity.ok(ApiResponse.<SharingSettings>builder()
                .success(true).data(s3Service.updateSharing(request.getKey(), settings)).build());
    }

    @PostMapping("/share/link")
    public ResponseEntity<ApiResponse<Object>> createShortLink(@RequestBody KeyRequest request) {
        try {
            if (request.getKey() == null || request.getKey().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.builder().success(false).message("Key is required").build());
            }
            ShareLink link = s3Service.createShortLink(request.getKey());
            return ResponseEntity.ok(ApiResponse.builder().success(true).data(link).build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.builder().success(false).message("Failed to create share link: " + e.getMessage())
                            .build());
        }
    }

    @GetMapping("/share/link/{id}")
    public ResponseEntity<ApiResponse<Object>> resolveShortLink(@PathVariable("id") String id) {
        ShareLink link = s3Service.getLinkById(id);
        if (link == null) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.builder().success(false).message("Link not found").build());
        }

        // "Anyone with the link can access" logic:
        // If a short link was explicitly generated and shared, we treat it as a valid
        // access token.
        // This mirrors the behavior where the link itself is the secret.

        String url = s3Service.getFileUrl(link.getKey(), true, false);
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(java.util.Map.of("url", url)).build());
    }

    @GetMapping("/storage-usage")
    public ResponseEntity<ApiResponse<Object>> getStorageUsage() {
        return ResponseEntity.ok(ApiResponse.builder()
                .success(true).data(s3Service.getStorageUsage()).build());
    }

    @GetMapping("/download-folder/{*key}")
    public void downloadFolder(@PathVariable("key") String key, HttpServletResponse response) throws IOException {
        String finalKey = key;
        if (finalKey != null && finalKey.startsWith("/")) {
            finalKey = finalKey.substring(1);
        }

        String folderName = "download";
        if (finalKey != null && !finalKey.isEmpty()) {
            String[] parts = finalKey.split("/");
            folderName = parts[parts.length - 1];
        }

        response.setContentType("application/zip");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + folderName + ".zip\"");

        try {
            s3Service.downloadFolder(finalKey, response.getOutputStream());
        } catch (Exception e) {
            log.error("Error downloading folder", e);
            if (!response.isCommitted()) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        }
    }
}
