package com.jarvis.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareLink {
    private String id; // The short ID: e.g. 4f9c-91ab
    private String key; // The original S3 key
    private String createdAt;
    private String expiresAt; // Optional expiration
}
