package com.jarvis.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SharingSettings {
    private List<SharedUser> sharedWith;
    private String generalAccess;
    private String generalRole; // viewer, commenter, editor
    private String updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SharedUser {
        private String email;
        private String role;
    }
}
