package com.example.bucketbrowser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class BucketController {
    private static final Logger logger = LoggerFactory.getLogger(BucketController.class);

    private final S3Service s3Service;
    private final DemoService demoService;
    private boolean demoMode;

    @Autowired
    public BucketController(S3Service s3Service, DemoService demoService) {
        this.s3Service = s3Service;
        this.demoService = demoService;
    }

    @PostConstruct
    public void init() {
        this.demoMode = !s3Service.isInitialized();
        if (demoMode) {
            logger.info("BucketController running in DEMO MODE");
        }
    }

    public boolean isDemoMode() {
        return demoMode;
    }

    @GetMapping("/bucket/list")
    public ResponseEntity<List<String>> getObjects() {
        try {
            logger.info("Received request to list bucket contents (demo={})", demoMode);
            var result = demoMode ? demoService.listFiles() : s3Service.listBucketContents();
            logger.info("Found {} objects", result.size());

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_TYPE, "application/json");
            return ResponseEntity.ok()
                .headers(headers)
                .body(result);
        } catch (Exception e) {
            logger.error("Error listing bucket contents: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/bucket/download/**")
    public ResponseEntity<byte[]> downloadFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        String key = path.substring(path.indexOf("/bucket/download/") + "/bucket/download/".length());
        try {
            logger.info("Download request for key: {} (demo={})", key, demoMode);

            // URL decode the key in case it was double-encoded
            String decodedKey = java.net.URLDecoder.decode(key, "UTF-8");
            logger.debug("Decoded key: {}", decodedKey);

            // Get the file as a byte array
            byte[] fileContent = demoMode
                    ? demoService.downloadFile(decodedKey)
                    : s3Service.downloadFile(decodedKey);
            logger.debug("File downloaded, size: {} bytes", fileContent.length);

            // Determine content type based on file extension
            String contentType = determineContentType(decodedKey);
            logger.debug("Determined content type: {}", contentType);

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_TYPE, contentType);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (Exception e) {
            logger.error("Error downloading file: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(("Error downloading file: " + e.getMessage()).getBytes());
        }
    }

    @PutMapping("/bucket/update/**")
    public ResponseEntity<String> updateFile(HttpServletRequest request, @RequestBody String content) {
        String path = request.getRequestURI();
        String key = path.substring(path.indexOf("/bucket/update/") + "/bucket/update/".length());
        try {
            logger.info("Received file update request for key: {} (demo={})", key, demoMode);

            // URL decode the key in case it was double-encoded
            String decodedKey = java.net.URLDecoder.decode(key, "UTF-8");
            logger.debug("Decoded key: {}", decodedKey);

            // Determine content type based on file extension
            String contentType = determineContentType(decodedKey);

            // Convert content string to byte array
            byte[] fileContent = content.getBytes();

            // Upload (overwriting the existing file)
            if (demoMode) {
                demoService.uploadFile(decodedKey, fileContent, contentType);
            } else {
                s3Service.uploadFile(decodedKey, fileContent, contentType);
            }

            logger.info("Updated file successfully with key: {}", key);
            return ResponseEntity.ok("File updated successfully: " + key);
        } catch (Exception e) {
            logger.error("Error updating file: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body("Error updating file: " + e.getMessage());
        }
    }

    @PostMapping("/bucket/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file,
                                            @RequestParam("key") String key) {
        try {
            logger.info("Received file upload request - file size: {}, name: {}, key: {} (demo={})",
                    file.getSize(), file.getOriginalFilename(), key, demoMode);

            byte[] fileContent = file.getBytes();
            String contentType = file.getContentType();

            if (demoMode) {
                demoService.uploadFile(key, fileContent, contentType);
            } else {
                s3Service.uploadFile(key, fileContent, contentType);
            }

            logger.info("Uploaded file successfully with key: {}", key);
            return ResponseEntity.ok("File uploaded successfully: " + key);
        } catch (IOException e) {
            logger.error("Error uploading file due to IO exception: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body("Error uploading file: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Error uploading file: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body("Error uploading file: " + e.getMessage());
        }
    }

    @DeleteMapping("/bucket/delete/**")
    public ResponseEntity<String> deleteFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        String key = path.substring(path.indexOf("/bucket/delete/") + "/bucket/delete/".length());
        try {
            logger.info("Received request to delete file with key: {} (demo={})", key, demoMode);

            // URL decode the key in case it was double-encoded
            String decodedKey = java.net.URLDecoder.decode(key, "UTF-8");

            if (demoMode) {
                demoService.deleteFile(decodedKey);
            } else {
                s3Service.deleteFile(decodedKey);
            }

            logger.info("Deleted file successfully with key: {}", key);
            return ResponseEntity.ok("File deleted successfully: " + key);
        } catch (Exception e) {
            logger.error("Error deleting file: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body("Error deleting file: " + e.getMessage());
        }
    }

    @GetMapping("/api/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        logger.info("API status check requested");
        Map<String, Object> status = new HashMap<>();
        status.put("status", "ok");
        status.put("timestamp", new java.util.Date().toString());
        status.put("demoMode", demoMode);

        if (demoMode) {
            status.put("bucketConnection", "demo");
            status.put("bucketItemCount", demoService.listFiles().size());
        } else {
            try {
                List<String> bucketItems = s3Service.listBucketContents();
                status.put("bucketConnection", "ok");
                status.put("bucketItemCount", bucketItems.size());
                logger.info("API status: bucket connection successful, found {} items", bucketItems.size());
            } catch (Exception e) {
                logger.error("API status: bucket connection failed: {}", e.getMessage(), e);
                status.put("bucketConnection", "error");
                status.put("bucketError", e.getMessage());
            }
        }

        return ResponseEntity.ok(status);
    }

    private String determineContentType(String filename) {
        String extension = "";
        int i = filename.lastIndexOf('.');
        if (i > 0) {
            extension = filename.substring(i + 1).toLowerCase();
        }

        switch (extension) {
            // Text formats
            case "txt": return "text/plain";
            case "html": return "text/html";
            case "css": return "text/css";
            case "js": return "text/javascript";
            case "json": return "application/json";
            case "xml": return "application/xml";
            case "csv": return "text/csv";
            case "md": return "text/markdown";
            case "sh": return "text/x-shellscript";
            case "py": return "text/x-python";
            // Image formats
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "gif": return "image/gif";
            case "bmp": return "image/bmp";
            case "svg": return "image/svg+xml";
            // Document formats
            case "pdf": return "application/pdf";
            case "doc": case "docx": return "application/msword";
            case "xls": case "xlsx": return "application/vnd.ms-excel";
            case "ppt": case "pptx": return "application/vnd.ms-powerpoint";
            // Archive formats
            case "zip": return "application/zip";
            case "rar": return "application/x-rar-compressed";
            // Default
            default: return "application/octet-stream";
        }
    }
}
