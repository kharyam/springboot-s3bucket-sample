package com.example.bucketlister;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class ConfigController {
    
    @Value("${app.readonly.mode:false}")
    private boolean readOnlyMode;
    
    @Value("${bucket.host}")
    private String bucketHost;
    
    @Value("${bucket.name}")
    private String bucketName;
    
    @GetMapping("/api/config")
    public Map<String, Object> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("readOnlyMode", readOnlyMode);
        config.put("bucketHost", bucketHost);
        config.put("bucketName", bucketName);
        return config;
    }
}
