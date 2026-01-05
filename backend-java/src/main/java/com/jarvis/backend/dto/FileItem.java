package com.jarvis.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class FileItem {
    private String key;
    private String name;
    private Long size;
    private Instant lastModified;
    @JsonProperty("isFolder")
    private Boolean isFolder;
    private String url;
}
