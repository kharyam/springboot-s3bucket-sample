package com.example.bucketlister;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @Autowired
    public BucketController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    @GetMapping("/bucket/list")
    public ResponseEntity<List<String>> getObjects() {
        try {
            logger.info("Received request to list bucket contents");
            var result = s3Service.listBucketContents();
            logger.info("Found {} objects in bucket", result.size());
            
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

    //@GetMapping("/bucket/download/{key:.*}")
    @GetMapping("/bucket/download/**")
    public ResponseEntity<byte[]> downloadFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        String key = path.substring(path.indexOf("/bucket/download/") + "/bucket/download/".length());
        try {
            logger.info("Download request for key: {}", key);
            
            // URL decode the key in case it was double-encoded
            String decodedKey = java.net.URLDecoder.decode(key, "UTF-8");
            logger.debug("Decoded key: {}", decodedKey);
            
            // Get the file as a byte array from S3
            byte[] fileContent = s3Service.downloadFile(decodedKey);
            logger.debug("File downloaded, size: {} bytes", fileContent.length);

            // Determine content type based on file extension
            String contentType = determineContentType(decodedKey);
            logger.debug("Determined content type: {}", contentType);

            // Set headers to indicate it's a file download
            HttpHeaders headers = new HttpHeaders();
            
            // For preview functionality, we don't include the Content-Disposition header
            // headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + key.substring(key.lastIndexOf('/') + 1));
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
            logger.info("Received file update request for key: {}", key);
            
            // URL decode the key in case it was double-encoded
            String decodedKey = java.net.URLDecoder.decode(key, "UTF-8");
            logger.debug("Decoded key: {}", decodedKey);
            
            // Determine content type based on file extension
            String contentType = determineContentType(decodedKey);
            
            // Convert content string to byte array
            byte[] fileContent = content.getBytes();
            
            // Upload to S3 (overwriting the existing file)
            s3Service.uploadFile(decodedKey, fileContent, contentType);
            
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
            // Get file content as byte array
            logger.info("Received file upload request - file size: {}, name: {}, key: {}", 
                    file.getSize(), file.getOriginalFilename(), key);
            
            byte[] fileContent = file.getBytes();
            String contentType = file.getContentType();

            // Upload to S3
            s3Service.uploadFile(key, fileContent, contentType);

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


    // @GetMapping("/bucket/download/**")
    // public ResponseEntity<byte[]> downloadFile(HttpServletRequest request) {
    //     String path = request.getRequestURI();
    //     String key = path.substring(path.indexOf("/bucket/download/") + "/bucket/download/".length());

    @DeleteMapping("/bucket/delete/**")
    public ResponseEntity<String> deleteFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        String key = path.substring(path.indexOf("/bucket/delete/") + "/bucket/delete/".length());
        try {
            // Delete from S3
            logger.info("Received request to delete file with key: {}", key);
            
            // URL decode the key in case it was double-encoded 
            String decodedKey = java.net.URLDecoder.decode(key, "UTF-8");
            
            s3Service.deleteFile(decodedKey);

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

        try {
            // Try to list bucket to see if S3 connection is working
            List<String> bucketItems = s3Service.listBucketContents();
            status.put("bucketConnection", "ok");
            status.put("bucketItemCount", bucketItems.size());
            logger.info("API status: bucket connection successful, found {} items", bucketItems.size());
        } catch (Exception e) {
            logger.error("API status: bucket connection failed: {}", e.getMessage(), e);
            status.put("bucketConnection", "error");
            status.put("bucketError", e.getMessage());
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
