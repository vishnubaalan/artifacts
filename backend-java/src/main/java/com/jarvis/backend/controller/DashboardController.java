package com.jarvis.backend.controller;

import com.jarvis.backend.dto.ApiResponse;
import com.jarvis.backend.dto.FileItem;
import com.jarvis.backend.service.S3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final S3Service s3Service;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Object>> getStats() {
        try {
            // Parallel fetch simulated by just calling both (S3 SDK async/cache helps
            // speed)
            Map<String, Object> storageUsage = s3Service.getStorageUsage();
            List<FileItem> recentFiles = s3Service.getRecentActivity(10);

            List<Map<String, Object>> activities = recentFiles.stream().map(file -> {
                boolean isTrash = file.getKey().startsWith("trash/");
                Map<String, Object> activity = new HashMap<>();
                activity.put("id", file.getKey());
                activity.put("type", isTrash ? "delete" : "upload");
                activity.put("userName", "S3 Storage");
                activity.put("fileName", file.getName());
                activity.put("timestamp", file.getLastModified());
                activity.put("status", isTrash ? "Deleted" : "Modified");
                return activity;
            }).collect(Collectors.toList());

            // Construct response
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalFiles", storageUsage.get("fileCount"));
            stats.put("totalFolders", storageUsage.get("folderCount"));
            stats.put("storageUsed", storageUsage.get("totalBytes"));
            stats.put("storageQuota", storageUsage.get("quotaBytes"));

            long totalBytes = ((Number) storageUsage.get("totalBytes")).longValue();
            long quotaBytes = ((Number) storageUsage.get("quotaBytes")).longValue();

            int percent = (int) Math.min(Math.round(((double) totalBytes / (quotaBytes > 0 ? quotaBytes : 1)) * 100),
                    100);
            stats.put("usedPercentage", percent);

            Map<String, Object> data = new HashMap<>();
            data.put("stats", stats);
            data.put("breakdown", storageUsage.get("breakdown"));
            data.put("activities", activities);

            return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.builder().success(false)
                            .message("Failed to fetch dashboard data: " + e.getMessage()).build());
        }
    }
}
