package com.jarvis.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UploadResponse {
    private boolean success;
    private String key;
    private String location;
}
