package com.jarvis.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FileListResponse {
    private List<FileItem> items;
    private String nextContinuationToken;
    @JsonProperty("isTruncated")
    private Boolean isTruncated;
}
