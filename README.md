# S3 Bucket Browser

A Spring Boot application for browsing, managing, and interacting with S3-compatible object storage buckets through both a modern web interface and RESTful API endpoints.

## Overview

Bucket Lister provides a convenient way to manage files in S3-compatible object storage. The application offers:

- **Web Interface**: A modern, responsive UI for browsing and managing bucket contents
- **Folder-Based Navigation**: Navigate through nested folder structures
- **File Operations**: Upload, download, preview, and delete files
- **Multi-Select**: Select multiple files for batch deletion
- **Search**: Find files quickly with the built-in search functionality
- **Read-Only Mode**: Optional configuration to provide a read-only view

## Configuration

The application is configured through the following properties in `application.properties`:

| Property | Description | Required | Default |
|----------|-------------|----------|---------|
| `bucket.access.key` | AWS/S3 access key ID | Yes | - |
| `bucket.secret.key` | AWS/S3 secret access key | Yes | - |
| `bucket.name` | Bucket name to connect to | Yes | - |
| `bucket.host` | S3 endpoint URL (e.g., http://minio.example.com:9000) | Yes | - |
| `app.readonly.mode` | Disables write operations when set to true | No | false |

### Environment Variables

You can set these properties via environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export BUCKET_NAME=your_bucket_name
export BUCKET_HOST=http://your-s3-endpoint:9000
```

## API Endpoints

### Bucket Operations

#### List Bucket Contents

Lists all objects in the bucket.

```
GET /bucket/list
```

Example:
```bash
curl -X GET http://localhost:8080/bucket/list
```

Response:
```json
["file1.txt", "folder/file2.jpg", "folder/subfolder/file3.pdf"]
```

#### Download a File

Downloads a file from the bucket.

```
GET /bucket/download/{key}
```

Example:
```bash
# Download a file
curl -X GET http://localhost:8080/bucket/download/example.txt -o example.txt

# Download a file from a subfolder
curl -X GET http://localhost:8080/bucket/download/folder/example.txt -o example.txt
```

#### Upload a File

Uploads a file to the bucket.

```
POST /bucket/upload
```

Example:
```bash
# Upload a file
curl -X POST http://localhost:8080/bucket/upload \
  -F "file=@/path/to/local/file.txt" \
  -F "key=file.txt"

# Upload a file to a subfolder
curl -X POST http://localhost:8080/bucket/upload \
  -F "file=@/path/to/local/file.txt" \
  -F "key=folder/file.txt"
```

#### Delete a File

Deletes a file from the bucket.

```
DELETE /bucket/delete/{key}
```

Example:
```bash
# Delete a file
curl -X DELETE http://localhost:8080/bucket/delete/example.txt

# Delete a file from a subfolder
curl -X DELETE http://localhost:8080/bucket/delete/folder/example.txt
```

### Application Status

#### Get Application Status

Returns the current status of the application, including bucket connection information.

```
GET /api/status
```

Example:
```bash
curl -X GET http://localhost:8080/api/status
```

Response:
```json
{
  "status": "ok",
  "timestamp": "Thu Jun 20 10:15:30 UTC 2024",
  "bucketConnection": "ok",
  "bucketItemCount": 42
}
```

#### Get Application Configuration

Returns the application configuration (primarily used by the web UI).

```
GET /api/config
```

Example:
```bash
curl -X GET http://localhost:8080/api/config
```

Response:
```json
{
  "readOnlyMode": false
}
```

## Web UI Features

The web interface provides a user-friendly way to interact with your S3-compatible bucket:

### Browsing
- **Folder Navigation**: Click on folders to navigate into them
- **Breadcrumbs**: Easily navigate back to parent folders
- **File Type Icons**: Visual indicators for different file types
- **Search**: Filter files by name within the current folder

### File Operations
- **Download**: Download any file to your local system
- **Preview**: View compatible files directly in the browser (text, images, etc.)
- **Delete**: Remove individual files or multiple selected files
- **Upload**: Upload new files to the current folder

### UI Controls
- **Refresh**: Update the current view to see the latest bucket contents
- **Multiselect**: Select multiple files for batch operations
- **Progress Indicators**: Visual feedback during uploads

## Read-Only Mode

When `app.readonly.mode=true` is set in the configuration, the application operates in a read-only state:

- Upload and delete buttons are hidden
- File checkboxes for selection are removed
- Delete buttons are removed from individual file actions
- Server rejects any write operations (upload/delete)

This mode is useful for providing a view-only interface to your bucket contents.

## Usage Requirements

- JDK 17 or higher
- S3-compatible object storage (AWS S3, MinIO, etc.)
- Valid S3 access credentials

## Starting the Application

```bash
# Set required environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export BUCKET_NAME=your_bucket_name
export BUCKET_HOST=http://your-s3-endpoint:9000

# Run the application
./mvnw spring-boot:run
```

Access the web interface by navigating to http://localhost:8080 in your browser.

## Security Considerations

- The application uses the provided S3 credentials to access the bucket
- Consider using HTTPS in production environments
- Read-only mode provides an additional layer of security when write access isn't needed

## Troubleshooting

### Common Issues

- **Connection Failures**: Ensure your S3 endpoint is accessible and credentials are correct
- **File Not Found**: Check that the specified key exists in the bucket
- **Upload Failures**: Verify write permissions and bucket policies

### Logging

The application uses SLF4J logging. To increase log verbosity, modify your `application.properties`:

```properties
logging.level.com.example.bucketlister=DEBUG
```
