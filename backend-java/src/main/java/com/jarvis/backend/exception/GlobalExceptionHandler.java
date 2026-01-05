package com.jarvis.backend.exception;

import com.jarvis.backend.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAllExceptions(Exception ex, WebRequest request) {
        String message = "Internal Server Error";
        if (request.getDescription(false).contains("/direct-upload"))
            message = "Failed to upload file";
        else if (request.getDescription(false).contains("/upload-url"))
            message = "Failed to generate upload URL";
        else if (request.getDescription(false).contains("/list"))
            message = "Failed to list files";
        else if (request.getDescription(false).contains("/delete"))
            message = "Failed to delete file";
        else if (request.getDescription(false).contains("/create-folder"))
            message = "Failed to create folder";
        else if (request.getDescription(false).contains("/move-to-trash"))
            message = "Failed to move to trash";
        else if (request.getDescription(false).contains("/restore"))
            message = "Failed to restore file";
        else if (request.getDescription(false).contains("/dashboard"))
            message = "Failed to fetch dashboard statistics";

        // Use generic message if specific one not found or refine logic
        // Node uses hardcoded messages per route.
        // I'll try to map common ones, or just use exception message if useful.

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Void>builder()
                        .success(false)
                        .message(message) // Ideally context aware
                        .error(ex.getMessage())
                        .build());
    }
}
