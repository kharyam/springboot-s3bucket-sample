// Debug helper
const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log('[BucketLister]', ...args);
    }
}

// Set up state and event listeners
const state = {
    files: [],          // Raw list of files from server
    organizedFiles: [], // Files organized by current path
    selectedFiles: new Set(),
    breadcrumbs: [{ name: "Root", path: "" }],
    currentPath: ""
};

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    log('DOM content loaded, initializing app');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load files
    await loadFiles();
});

function setupEventListeners() {
    // Add event listener for refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadFiles);
    }
    
    // Add event listener for upload button
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', openUploadModal);
    }
    
    // Add event listener for delete selected button
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', deleteSelectedFiles);
    }
    
    // Add event listener for search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterFiles);
    }
    
    // Add event listener for select all checkbox
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }
    
    // Add event listeners for modal close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const previewModal = document.getElementById('preview-modal');
            const uploadModal = document.getElementById('upload-modal');
            
            if (previewModal) previewModal.style.display = 'none';
            if (uploadModal) uploadModal.style.display = 'none';
        });
    });
    
    // Add event listener for upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFormUpload);
    }
    
    log('Event listeners set up');
}

// Load files from server
async function loadFiles() {
    log('Loading files');
    const fileList = document.getElementById('file-list');
    const loader = document.getElementById('loader');
    
    if (fileList) {
        fileList.innerHTML = '<div class="loader" id="loader">Loading files...</div>';
    }
    
    try {
        // Fetch files from server
        const response = await fetch('/bucket/list');
        
        if (!response.ok) {
            throw new Error(`Failed to load files: ${response.status} ${response.statusText}`);
        }
        
        // Parse response
        state.files = await response.json();
        log('Received files:', state.files);
        
        // Organize files by current path
        state.organizedFiles = organizeFiles(state.files);
        log('Organized files:', state.organizedFiles);
        
        // Render files and breadcrumbs
        renderFiles();
        renderBreadcrumbs();
        
    } catch (error) {
        console.error('Error loading files:', error);
        
        if (fileList) {
            fileList.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading files: ${error.message}</p>
                    <button class="btn primary" onclick="loadFiles()">Retry</button>
                </div>
            `;
        }
    }
}

// Open upload modal
function openUploadModal() {
    const uploadModal = document.getElementById('upload-modal');
    const currentPathDisplay = document.getElementById('current-path-display');
    const uploadForm = document.getElementById('upload-form');
    
    if (currentPathDisplay) {
        currentPathDisplay.textContent = state.currentPath || '/';
    }
    
    if (uploadForm) {
        uploadForm.reset();
    }
    
    if (uploadModal) {
        uploadModal.style.display = 'block';
    }
}

// Handle form upload
function handleFormUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input');
    const customKeyInput = document.getElementById('custom-key');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const uploadModal = document.getElementById('upload-modal');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please select a file to upload');
        return;
    }
    
    const fileToUpload = fileInput.files[0];
    
    // Determine the key (path + filename)
    let key = customKeyInput && customKeyInput.value ? customKeyInput.value.trim() : '';
    if (!key) {
        key = fileToUpload.name;
    }
    
    // Add current path if we're in a subfolder
    if (state.currentPath) {
        key = `${state.currentPath}/${key}`;
    }
    
    log('Uploading file:', key);
    
    // Show progress
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('key', key);
    
    // Upload the file
    fetch('/bucket/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`${response.status} ${response.statusText}: ${text}`);
            });
        }
        return response.text();
    })
    .then(() => {
        // Success!
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        
        setTimeout(() => {
            if (uploadModal) uploadModal.style.display = 'none';
            loadFiles(); // Refresh the file list
        }, 1000);
    })
    .catch(error => {
        console.error('Error uploading file:', error);
        alert(`Failed to upload file: ${error.message}`);
        if (uploadProgress) uploadProgress.style.display = 'none';
    });
}

// Organize files by current path and identify folders
function organizeFiles(allKeys) {
    const currentPathPrefix = state.currentPath ? state.currentPath + '/' : '';
    const result = [];
    const seenFolders = new Set();
    
    log('Organizing files for path:', state.currentPath);
    log('Current path prefix:', currentPathPrefix);
    
    allKeys.forEach(key => {
        // Skip keys that don't start with the current path
        if (state.currentPath && !key.startsWith(currentPathPrefix) && key !== state.currentPath) {
            log('Skipping key not in current path:', key);
            return;
        }
        
        // Skip the current path itself
        if (key === state.currentPath && state.currentPath !== '') {
            log('Skipping current path itself:', key);
            return;
        }
        
        // Remove the current path prefix to get relative path
        const relativePath = state.currentPath ? 
            (key.startsWith(currentPathPrefix) ? key.substring(currentPathPrefix.length) : key) : 
            key;
        
        // Skip if relative path is empty
        if (!relativePath) {
            log('Skipping empty relative path for key:', key);
            return;
        }
        
        log('Processing key:', key, 'relativePath:', relativePath);
        
        const parts = relativePath.split('/');
        
        if (parts.length === 1) {
            // This is a file in the current directory
            log('Adding file:', parts[0]);
            result.push({
                key: key,
                name: parts[0],
                isFolder: false,
                size: 0, // Size would need to be fetched from the backend
            });
        } else if (parts.length > 1) {
            // This is a subfolder
            const folderName = parts[0];
            if (!seenFolders.has(folderName)) {
                log('Adding folder:', folderName);
                seenFolders.add(folderName);
                result.push({
                    key: state.currentPath ? `${state.currentPath}/${folderName}` : folderName,
                    name: folderName,
                    isFolder: true,
                });
            }
        }
    });
    
    // Sort folders first, then files alphabetically
    return result.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
    });
}

// Navigate to a folder
function navigateToFolder(folderKey) {
    log('Navigating to folder:', folderKey);
    state.currentPath = folderKey;
    
    // Update breadcrumbs
    const parts = folderKey.split('/');
    state.breadcrumbs = [{ name: "Root", path: "" }];
    
    let currentPath = '';
    for (let part of parts) {
        if (!part) continue;
        currentPath += (currentPath ? '/' : '') + part;
        state.breadcrumbs.push({
            name: part,
            path: currentPath
        });
    }
    
    log('Updated breadcrumbs:', state.breadcrumbs);
    loadFiles();
}

// Render files to the UI
function renderFiles() {
    log('Rendering files');
    const fileList = document.getElementById('file-list');
    
    if (!fileList) {
        log('Error: fileList element not available');
        return;
    }
    
    if (state.organizedFiles.length === 0) {
        fileList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-folder-open"></i>
                <p>This folder is empty</p>
            </div>
        `;
        log('No files to display');
        return;
    }
    
    const filteredFiles = filterFilesBySearch();

    if (filteredFiles.length === 0) {
        fileList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-search"></i>
                <p>No files match your search</p>
            </div>
        `;
        log('No files match search');
        return;
    }
    
    const html = filteredFiles.map(file => {
        const isSelected = state.selectedFiles.has(file.key);
        return `
            <div class="file-item ${isSelected ? 'selected' : ''}" data-key="${file.key}">
                <div class="checkbox-cell">
                    ${!file.isFolder ? `<input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>` : '<span></span>'}
                </div>
                <div class="filename-cell">
                    <i class="file-icon fas ${file.isFolder ? 'fa-folder folder-icon' : getFileIcon(file.name)}"></i>
                    <span class="${file.isFolder ? 'folder-name' : 'file-name'}">${file.name}</span>
                </div>
                <div class="filesize-cell">
                    ${file.isFolder ? '' : formatFileSize(file.size)}
                </div>
                <div class="actions-cell">
                    ${file.isFolder ? '' : `
                        <button class="action-btn download-btn" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        ${isPreviewable(file.name) ? `
                            <button class="action-btn preview-btn" title="Preview">
                                <i class="fas fa-eye"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn delete delete-btn" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');

    fileList.innerHTML = html;
    
    // Add event listeners to the newly created elements
    addFileItemEventListeners();
    log('Files rendered');
}

// Add event listeners to file items
function addFileItemEventListeners() {
    // File checkboxes
    document.querySelectorAll('.file-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const fileItem = e.target.closest('.file-item');
            const key = fileItem.dataset.key;

            if (e.target.checked) {
                state.selectedFiles.add(key);
                fileItem.classList.add('selected');
  } else {
                state.selectedFiles.delete(key);
                fileItem.classList.remove('selected');
            }
            
            updateDeleteButton();
        });
    });

    // Folder names
    document.querySelectorAll('.folder-name').forEach(folder => {
        folder.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            const folderKey = fileItem.dataset.key;
            navigateToFolder(folderKey);
        });
    });

    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            const key = fileItem.dataset.key;
            downloadFile(key);
        });
    });

    // Preview buttons
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            const key = fileItem.dataset.key;
            previewFile(key);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            const key = fileItem.dataset.key;
            deleteFile(key);
        });
    });
}

// Render breadcrumbs
function renderBreadcrumbs() {
    const breadcrumbElement = document.getElementById('breadcrumb');
    if (!breadcrumbElement) {
        log('Error: breadcrumbElement not available');
        return;
    }
    
    log('Rendering breadcrumbs:', state.breadcrumbs);
    
    const html = state.breadcrumbs.map((crumb, index) => {
        const isActive = index === state.breadcrumbs.length - 1;
        return `
            <li class="breadcrumb-item ${isActive ? 'active' : ''}" data-path="${crumb.path}">
                ${isActive ? crumb.name : `<a href="javascript:void(0)">${crumb.name}</a>`}
            </li>
        `;
    }).join('');
    
    breadcrumbElement.innerHTML = html;
    
    // Add event listeners to breadcrumb items
    document.querySelectorAll('.breadcrumb-item:not(.active) a').forEach(item => {
        item.addEventListener('click', (e) => {
            const li = e.target.closest('.breadcrumb-item');
            const path = li.dataset.path;
            state.currentPath = path;
            loadFiles();
        });
    });
}

// Filter files based on search input
function filterFiles() {
    renderFiles();
}

// Filter files based on search term
function filterFilesBySearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '';
    
    if (!searchTerm) return state.organizedFiles;
    
    return state.organizedFiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm)
    );
}

// Update delete button state
function updateDeleteButton() {
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const selectAllCheckbox = document.getElementById('select-all');
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = state.selectedFiles.size === 0;
    }
    
    if (selectAllCheckbox && document.querySelectorAll('.file-checkbox').length > 0) {
        selectAllCheckbox.checked = 
            state.selectedFiles.size > 0 && 
            state.selectedFiles.size === document.querySelectorAll('.file-checkbox').length;
    }
}

// Toggle select all files
function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    
    document.querySelectorAll('.file-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
        const fileItem = checkbox.closest('.file-item');
        const key = fileItem.dataset.key;
        
        if (isChecked) {
            state.selectedFiles.add(key);
            fileItem.classList.add('selected');
        } else {
            state.selectedFiles.delete(key);
            fileItem.classList.remove('selected');
        }
    });
    
    updateDeleteButton();
}

// Download a file
function downloadFile(key) {
    log('Downloading file:', key);
    const link = document.createElement('a');
    link.href = `/bucket/download/${encodeURIComponent(key)}`;
    link.download = key.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Preview a file
async function previewFile(key) {
    log('Previewing file:', key);
    const previewModal = document.getElementById('preview-modal');
    const previewContainer = document.getElementById('preview-container');
    const previewTitle = document.getElementById('preview-title');

    if (!previewModal || !previewContainer || !previewTitle) {
        console.error('Preview elements not found');
        return;
    }

    try {
        // Show loading in preview container
        previewContainer.innerHTML = '<div class="loader">Loading preview...</div>';
        previewModal.style.display = 'block';

        previewTitle.textContent = key.split('/').pop();

        log('Fetching file for preview:', key);
        const response = await fetch(`/bucket/download/${encodeURIComponent(key)}`);

        if (!response.ok) {
            log('Preview fetch failed:', response.status, response.statusText);
            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        log('File content type:', contentType);

        // Handle different content types
        if (contentType && contentType.startsWith('image/')) {
            // Handle image preview
            log('Previewing as image');
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            previewContainer.innerHTML = `<img src="${imageUrl}" alt="${key}">`;
        } else {
            // Try as text for anything that might be readable
            log('Trying to preview as text');
            try {
                const text = await response.text();

                if (text.length > 500000) {
                    // If file is too large, show only the beginning
                    previewContainer.innerHTML = `<pre>${escapeHtml(text.substring(0, 500000))}...\n\n[File truncated, too large to display completely]</pre>`;
                } else {
                    previewContainer.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
                }

                log('Text preview successful');
            } catch (textError) {
                log('Text preview failed:', textError);
                previewContainer.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-file"></i>
                        <p>Preview not available for this file type or content</p>
                    </div>`;
            }
        }
    } catch (error) {
        console.error('Error previewing file:', error);
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error: ${error.message}</p>
                    <button class="btn primary" onclick="downloadFile('${key}')">Download Instead</button>
                </div>
            `;
        }
    }
}

// Delete a single file
async function deleteFile(key) {
    log('Deleting file:', key);
    if (!confirm(`Are you sure you want to delete "${key.split('/').pop()}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/bucket/delete/${encodeURIComponent(key)}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete file');
        
        // If the deletion was successful, reload the files
        loadFiles();
    } catch (error) {
        console.error('Error deleting file:', error);
        alert(`Failed to delete file: ${error.message}`);
    }
}

// Delete selected files
async function deleteSelectedFiles() {
    if (state.selectedFiles.size === 0) return;
    
    const fileCount = state.selectedFiles.size;
    log(`Deleting ${fileCount} selected files`);

    if (!confirm(`Are you sure you want to delete ${fileCount} file(s)?`)) {
        return;
    }

    setLoading(true);
    
    try {
        // Create an array of promises for each file deletion
        const deletePromises = Array.from(state.selectedFiles).map(key =>
            fetch(`/bucket/delete/${encodeURIComponent(key)}`, {
                method: 'DELETE'
            })
        );

        // Wait for all deletions to complete
        const results = await Promise.allSettled(deletePromises);

        // Check for any failures
        const failures = results.filter(result => result.status === 'rejected');

        if (failures.length > 0) {
            console.warn(`${failures.length} out of ${results.length} deletions failed`);
        }

        // Reload files regardless
        loadFiles();
    } catch (error) {
        console.error('Error during batch deletion:', error);
        alert(`Some files could not be deleted. Please try again.`);
    } finally {
        setLoading(false);
    }
}

// Set loading state
function setLoading(isLoading) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'block' : 'none';
    }
}

// Helper utilities
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getFileIcon(filename) {
    if (!filename) return 'fa-file';

    const extension = filename.split('.').pop().toLowerCase();

    const iconMap = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word',
        docx: 'fa-file-word',
        xls: 'fa-file-excel',
        xlsx: 'fa-file-excel',
        ppt: 'fa-file-powerpoint',
        pptx: 'fa-file-powerpoint',
        txt: 'fa-file-alt',
        csv: 'fa-file-csv',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        png: 'fa-file-image',
        gif: 'fa-file-image',
        mp3: 'fa-file-audio',
        wav: 'fa-file-audio',
        mp4: 'fa-file-video',
        zip: 'fa-file-archive',
        rar: 'fa-file-archive',
        json: 'fa-file-code',
        html: 'fa-file-code',
        css: 'fa-file-code',
        js: 'fa-file-code',
    };

    return iconMap[extension] || 'fa-file';
}

function isPreviewable(filename) {
    if (!filename) return false;

    const extension = filename.split('.').pop().toLowerCase();
    const previewableExtensions = [
        'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'
    ];

    return previewableExtensions.includes(extension);
}

function formatFileSize(size) {
    if (size === 0 || !size) return '';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;

    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }

    return Math.round(size * 100) / 100 + ' ' + units[i];
}