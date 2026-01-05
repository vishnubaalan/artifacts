package com.jarvis.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShareRequest {
    private String key;
    private List<SharingSettings.SharedUser> sharedWith;
    private String generalAccess;
    private String generalRole;
    private String access; // fallback for generalAccess
}
