package com.jarvis.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PresignedUrlResponse {
    private String url;
    private String key;
}
