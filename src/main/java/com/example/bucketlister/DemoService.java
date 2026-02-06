package com.example.bucketlister;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DemoService {
    private static final Logger logger = LoggerFactory.getLogger(DemoService.class);

    private final Map<String, byte[]> files = new LinkedHashMap<>();

    public DemoService() {
        initSampleFiles();
        logger.info("DemoService initialized with {} sample files", files.size());
    }

    private void initSampleFiles() {
        put("README.md",
            "# S3 Bucket Explorer — Demo\n\n" +
            "Welcome to the **S3 Bucket Explorer** demo!\n\n" +
            "This is running in **demo mode** with sample data.\n" +
            "No real S3 bucket is connected — all files live in memory.\n\n" +
            "## Features you can try\n\n" +
            "- Browse folders and files\n" +
            "- Preview text files (click a file name)\n" +
            "- Edit and save text files\n" +
            "- Upload new files\n" +
            "- Delete files\n" +
            "- Search / filter\n" +
            "- Toggle dark mode\n\n" +
            "Changes are **temporary** and reset when the server restarts.\n");

        put("config.json",
            "{\n" +
            "  \"appName\": \"S3 Bucket Explorer\",\n" +
            "  \"version\": \"1.0.0\",\n" +
            "  \"features\": {\n" +
            "    \"preview\": true,\n" +
            "    \"edit\": true,\n" +
            "    \"upload\": true,\n" +
            "    \"delete\": true\n" +
            "  },\n" +
            "  \"theme\": \"auto\"\n" +
            "}\n");

        put("notes.txt",
            "Quick Notes\n" +
            "===========\n\n" +
            "- Remember to check the dark mode toggle in the top-right corner.\n" +
            "- You can edit this file! Click it, then press Edit.\n" +
            "- Uploaded files appear instantly in the list.\n" +
            "- Deleted files disappear until the next server restart.\n");

        put("documents/report-2024.txt",
            "Annual Report — 2024\n" +
            "====================\n\n" +
            "Summary\n" +
            "-------\n" +
            "This is a sample report file demonstrating the folder navigation\n" +
            "and text preview capabilities of the S3 Bucket Explorer.\n\n" +
            "Key Highlights:\n" +
            "  * Storage usage grew 45% year-over-year\n" +
            "  * 12,000 files processed daily\n" +
            "  * 99.97% uptime achieved\n");

        put("documents/budget.csv",
            "Category,Q1,Q2,Q3,Q4\n" +
            "Infrastructure,12000,13500,14200,15000\n" +
            "Storage,8000,8500,9200,10000\n" +
            "Bandwidth,3000,3200,3800,4100\n" +
            "Support,5000,5000,5500,5500\n");

        put("documents/guidelines.md",
            "# Upload Guidelines\n\n" +
            "## Supported File Types\n\n" +
            "| Category | Extensions |\n" +
            "|----------|------------|\n" +
            "| Text     | .txt, .md, .csv, .json |\n" +
            "| Images   | .jpg, .png, .gif, .svg |\n" +
            "| Archives | .zip, .tar.gz |\n\n" +
            "## Best Practices\n\n" +
            "1. Use descriptive file names\n" +
            "2. Organize files into folders\n" +
            "3. Keep individual files under 100 MB\n");

        put("images/logo.svg",
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\">\n" +
            "  <defs>\n" +
            "    <linearGradient id=\"g1\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n" +
            "      <stop offset=\"0%\" style=\"stop-color:#4f46e5\"/>\n" +
            "      <stop offset=\"100%\" style=\"stop-color:#7c3aed\"/>\n" +
            "    </linearGradient>\n" +
            "  </defs>\n" +
            "  <rect width=\"200\" height=\"200\" rx=\"32\" fill=\"url(#g1)\"/>\n" +
            "  <text x=\"100\" y=\"125\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\"\n" +
            "        font-size=\"72\" font-weight=\"bold\" fill=\"white\">S3</text>\n" +
            "</svg>\n");

        put("images/banner.svg",
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 200\">\n" +
            "  <defs>\n" +
            "    <linearGradient id=\"bg\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n" +
            "      <stop offset=\"0%\" style=\"stop-color:#1e1b4b\"/>\n" +
            "      <stop offset=\"50%\" style=\"stop-color:#4f46e5\"/>\n" +
            "      <stop offset=\"100%\" style=\"stop-color:#7c3aed\"/>\n" +
            "    </linearGradient>\n" +
            "  </defs>\n" +
            "  <rect width=\"600\" height=\"200\" rx=\"16\" fill=\"url(#bg)\"/>\n" +
            "  <text x=\"300\" y=\"110\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\"\n" +
            "        font-size=\"36\" font-weight=\"bold\" fill=\"white\">S3 Bucket Explorer</text>\n" +
            "  <text x=\"300\" y=\"150\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\"\n" +
            "        font-size=\"18\" fill=\"rgba(255,255,255,0.7)\">Browse, preview, and manage your files</text>\n" +
            "</svg>\n");

        put("scripts/deploy.sh",
            "#!/bin/bash\n" +
            "# Sample deployment script\n\n" +
            "set -euo pipefail\n\n" +
            "echo \"Starting deployment...\"\n\n" +
            "APP_NAME=\"bucket-explorer\"\n" +
            "DEPLOY_DIR=\"/opt/${APP_NAME}\"\n\n" +
            "echo \"Building application...\"\n" +
            "mvn clean package -DskipTests\n\n" +
            "echo \"Deploying to ${DEPLOY_DIR}...\"\n" +
            "cp target/*.jar \"${DEPLOY_DIR}/app.jar\"\n\n" +
            "echo \"Restarting service...\"\n" +
            "systemctl restart ${APP_NAME}\n\n" +
            "echo \"Deployment complete!\"\n");

        put("scripts/setup.py",
            "\"\"\"Sample setup script for bucket configuration.\"\"\"\n\n" +
            "import os\n" +
            "import json\n\n\n" +
            "def get_config():\n" +
            "    \"\"\"Load configuration from environment.\"\"\"\n" +
            "    return {\n" +
            "        \"bucket_name\": os.getenv(\"BUCKET_NAME\", \"my-bucket\"),\n" +
            "        \"bucket_host\": os.getenv(\"BUCKET_HOST\", \"localhost:9000\"),\n" +
            "        \"region\": os.getenv(\"AWS_REGION\", \"us-east-1\"),\n" +
            "    }\n\n\n" +
            "def main():\n" +
            "    config = get_config()\n" +
            "    print(\"Bucket configuration:\")\n" +
            "    print(json.dumps(config, indent=2))\n\n\n" +
            "if __name__ == \"__main__\":\n" +
            "    main()\n");

        put("data/sample.json",
            "{\n" +
            "  \"users\": [\n" +
            "    { \"id\": 1, \"name\": \"Alice\", \"role\": \"admin\" },\n" +
            "    { \"id\": 2, \"name\": \"Bob\", \"role\": \"editor\" },\n" +
            "    { \"id\": 3, \"name\": \"Charlie\", \"role\": \"viewer\" }\n" +
            "  ],\n" +
            "  \"metadata\": {\n" +
            "    \"generated\": \"2024-01-15\",\n" +
            "    \"source\": \"demo\"\n" +
            "  }\n" +
            "}\n");

        put("data/exports/users.csv",
            "id,name,email,role,created\n" +
            "1,Alice,alice@example.com,admin,2024-01-01\n" +
            "2,Bob,bob@example.com,editor,2024-02-15\n" +
            "3,Charlie,charlie@example.com,viewer,2024-03-20\n" +
            "4,Diana,diana@example.com,editor,2024-04-10\n" +
            "5,Eve,eve@example.com,viewer,2024-05-05\n");
    }

    private void put(String key, String content) {
        files.put(key, content.getBytes(StandardCharsets.UTF_8));
    }

    public List<String> listFiles() {
        return new ArrayList<>(files.keySet());
    }

    public byte[] downloadFile(String key) throws Exception {
        byte[] data = files.get(key);
        if (data == null) {
            throw new Exception("File not found: " + key);
        }
        return data;
    }

    public void uploadFile(String key, byte[] content, String contentType) {
        files.put(key, content);
        logger.info("Demo: uploaded file '{}' ({} bytes)", key, content.length);
    }

    public void deleteFile(String key) {
        if (files.remove(key) != null) {
            logger.info("Demo: deleted file '{}'", key);
        } else {
            logger.warn("Demo: file not found for deletion: '{}'", key);
        }
    }
}
