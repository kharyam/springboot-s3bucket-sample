package com.example.bucketlister;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

@RestController
public class BucketController {

    private final S3DownloadService s3DownloadService;

    @Autowired
    public BucketController(S3DownloadService s3DownloadService) {
        this.s3DownloadService = s3DownloadService;
    }

    @GetMapping("/bucket/list")
    public ResponseEntity<List<String>> getObjects(){
        try{
            var result = s3DownloadService.listBucketContents();
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_TYPE, "application/text");
            return ResponseEntity.ok()
                .headers(headers)
                .body(result);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/bucket/download/{key}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String key) {
        try {
            // Get the file as a byte array from S3
            byte[] fileContent = s3DownloadService.downloadFile(key);

            // Set headers to indicate it's a file download
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + key);
            headers.add(HttpHeaders.CONTENT_TYPE, "application/octet-stream");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(("Error downloading file: " + e.getMessage()).getBytes());
        }
    }
}
