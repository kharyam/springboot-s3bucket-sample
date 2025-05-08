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
    
    @GetMapping("/api/config")
    public Map<String, Object> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("readOnlyMode", readOnlyMode);
        return config;
    }
}