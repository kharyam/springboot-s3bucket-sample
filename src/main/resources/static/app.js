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

let appConfig = {
    readOnlyMode: false,
    demoMode: false,
    bucketHost: '',
    bucketName: ''
};

document.addEventListener('DOMContentLoaded', async () => {
    log('DOM content loaded, initializing app');
    
    // Apply saved theme preference
    applySavedTheme();
    
    // Fetch application config first
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            appConfig = await response.json();
            log('Loaded app config:', appConfig);
            
            // Update bucket info in the header
            updateBucketInfo();
            
            // Apply demo mode if enabled
            if (appConfig.demoMode) {
                applyDemoMode();
            }

            // Apply read-only mode if enabled
            if (appConfig.readOnlyMode) {
                applyReadOnlyMode();
            }

            // Update mode indicator
            updateModeIndicator();
        }
    } catch (err) {
        console.error('Failed to load app config:', err);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Load files
    await loadFiles();
});

function applyReadOnlyMode() {
    log('Applying read-only mode to UI');
    
    // Hide or disable upload and delete buttons in the main UI
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.style.display = 'none';
    }
    
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.style.display = 'none';
    }
    
    // Also update the renderFiles function to not include delete buttons
    // This is done by modifying the original renderFiles function below
}

function applyDemoMode() {
    log('Applying demo mode to UI');
    document.body.classList.add('demo-mode');

    // Inject demo banner before the header
    const header = document.querySelector('.app-header');
    if (header) {
        const banner = document.createElement('div');
        banner.className = 'demo-banner';
        banner.innerHTML = `
            <div class="demo-banner-content">
                <i class="fas fa-flask" aria-hidden="true"></i>
                <span><strong>Demo Mode</strong> — Exploring with sample data. No S3 bucket is connected. Changes are temporary.</span>
            </div>
        `;
        header.parentNode.insertBefore(banner, header);
    }
}

function setupEventListeners() {
    // Add event listener for refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadFiles);
    }
    
    // Only set up upload in non-read-only mode
    if (!appConfig.readOnlyMode) {
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
        
        // Add event listener for upload form
        const uploadForm = document.getElementById('upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', handleFormUpload);
        }
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
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const previewModal = document.getElementById('preview-modal');
            const uploadModal = document.getElementById('upload-modal');
            const backdrop = document.querySelector('.modal-backdrop');

            if (previewModal) previewModal.style.display = 'none';
            if (uploadModal) uploadModal.style.display = 'none';
            if (backdrop) backdrop.style.display = 'none';
        });
    });
    
    // Add event listener for dark mode toggle
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', toggleDarkMode);
        log('Dark mode button event listener attached');
    } else {
        log('Dark mode button not found');
    }
    
    log('Event listeners set up');
}

// Load files from server
async function loadFiles() {
    log('Loading files');
    const fileList = document.getElementById('file-list');
    const loader = document.getElementById('loader');
    
    if (fileList) {
        fileList.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="pf-l-bullseye">
                        <div class="pf-c-spinner" role="progressbar" aria-label="Loading files">
                            <span class="pf-c-spinner__clipper"></span>
                            <span class="pf-c-spinner__lead-ball"></span>
                            <span class="pf-c-spinner__tail-ball"></span>
                        </div>
                    </div>
                </td>
            </tr>
        `;
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
                <tr>
                    <td colspan="4">
                        <div class="pf-c-empty-state">
                            <div class="pf-c-empty-state__content">
                                <i class="fas fa-exclamation-circle pf-c-empty-state__icon"></i>
                                <h2 class="pf-c-title pf-m-lg">Error loading files</h2>
                                <div class="pf-c-empty-state__body">
                                    <p>${error.message}</p>
                                </div>
                                <div class="pf-c-empty-state__primary">
                                    <button class="pf-c-button pf-m-primary" onclick="loadFiles()">Retry</button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

// Open upload modal
function openUploadModal() {
    const uploadModal = document.getElementById('upload-modal');
    const backdrop = document.querySelector('.modal-backdrop');
    const currentPathDisplay = document.getElementById('current-path-display');
    const uploadForm = document.getElementById('upload-form');

    if (currentPathDisplay) {
        currentPathDisplay.textContent = state.currentPath || '/';
    }

    if (uploadForm) {
        uploadForm.reset();
    }

    if (uploadModal) {
        // Re-trigger animation
        uploadModal.style.animation = 'none';
        uploadModal.offsetHeight; // force reflow
        uploadModal.style.animation = '';
        uploadModal.style.display = 'block';
    }

    if (backdrop) {
        backdrop.style.display = 'block';
    }
}

// Handle form upload
function handleFormUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input');
    const customKeyInput = document.getElementById('custom-key');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.getElementById('progress-percentage');
    const uploadModal = document.getElementById('upload-modal');
    const backdrop = document.querySelector('.modal-backdrop');

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
        
        // Update ARIA value
        const progressBarElement = document.querySelector('.progress-track');
        if (progressBarElement) {
            progressBarElement.setAttribute('aria-valuenow', '0');
        }
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
        
        // Update ARIA value
        const progressBarElement = document.querySelector('.progress-track');
        if (progressBarElement) {
            progressBarElement.setAttribute('aria-valuenow', '100');
        }
        
        setTimeout(() => {
            if (uploadModal) uploadModal.style.display = 'none';
            if (backdrop) backdrop.style.display = 'none';
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
            <tr>
                <td colspan="4">
                    <div class="pf-c-empty-state">
                        <div class="pf-c-empty-state__content">
                            <i class="fas fa-folder-open pf-c-empty-state__icon"></i>
                            <h2 class="pf-c-title pf-m-lg">This folder is empty</h2>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        log('No files to display');
        return;
    }
    
    const filteredFiles = filterFilesBySearch();

    if (filteredFiles.length === 0) {
        fileList.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="pf-c-empty-state">
                        <div class="pf-c-empty-state__content">
                            <i class="fas fa-search pf-c-empty-state__icon"></i>
                            <h2 class="pf-c-title pf-m-lg">No files match your search</h2>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        log('No files match search');
        return;
    }
    
    const html = filteredFiles.map((file, index) => {
        const isSelected = state.selectedFiles.has(file.key);
        const delay = index * 30;
        return `
            <tr class="${isSelected ? 'selected' : ''}" data-key="${file.key}" style="animation-delay: ${delay}ms">
                <td class="pf-c-table__check">
                    ${!file.isFolder && !appConfig.readOnlyMode ? 
                      `<input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>` : 
                      '<span></span>'}
                </td>
                <td>
                    <div class="pf-l-flex pf-m-align-items-center">
                        <i class="file-icon fas ${file.isFolder ? 'fa-folder folder-icon' : getFileIcon(file.name)}"></i>
                        <span class="${file.isFolder ? 'folder-name' : 'file-name'}">${file.name}</span>
                    </div>
                </td>
                <td>
                    ${file.isFolder ? '' : formatFileSize(file.size)}
                </td>
                <td>
                    <div class="pf-l-flex pf-m-justify-content-flex-end pf-m-gap-sm">
                        ${file.isFolder ? '' : `
                            <button class="pf-c-button pf-m-plain action-btn download-btn" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                            ${isPreviewable(file.name) ? `
                                <button class="pf-c-button pf-m-plain action-btn preview-btn" title="Preview">
                                    <i class="fas fa-eye"></i>
                                </button>
                            ` : ''}
                            ${!appConfig.readOnlyMode ? `
                                <button class="pf-c-button pf-m-plain action-btn delete delete-btn" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        `}
                    </div>
                </td>
            </tr>
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
            const fileItem = e.target.closest('tr');
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
            const fileItem = e.target.closest('tr');
            const folderKey = fileItem.dataset.key;
            navigateToFolder(folderKey);
        });
    });
    
    // File names - make text files clickable for preview
    document.querySelectorAll('.file-name').forEach(file => {
        file.addEventListener('click', (e) => {
            const fileItem = e.target.closest('tr');
            const key = fileItem.dataset.key;
            const fileName = e.target.textContent;
            
            // Only preview if it's a previewable file
            if (isPreviewable(fileName)) {
                previewFile(key);
            }
        });
    });

    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileItem = e.target.closest('tr');
            const key = fileItem.dataset.key;
            downloadFile(key);
        });
    });

    // Preview buttons
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileItem = e.target.closest('tr');
            const key = fileItem.dataset.key;
            previewFile(key);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fileItem = e.target.closest('tr');
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
            <li class="pf-c-breadcrumb__item" data-path="${crumb.path}">
                ${isActive ? 
                    `<span class="pf-c-breadcrumb__item-text">${crumb.name}</span>` : 
                    `<a href="javascript:void(0)" class="pf-c-breadcrumb__link">${crumb.name}</a>`
                }
            </li>
        `;
    }).join('');
    
    breadcrumbElement.innerHTML = html;
    
    // Add event listeners to breadcrumb items
    document.querySelectorAll('.pf-c-breadcrumb__link').forEach(item => {
        item.addEventListener('click', (e) => {
            const li = e.target.closest('.pf-c-breadcrumb__item');
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
        const fileItem = checkbox.closest('tr');
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
    link.href = `/bucket/download/${key}`;
    link.download = key.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Preview a file
async function previewFile(key) {
    log('Previewing file:', key);
    const previewModal = document.getElementById('preview-modal');
    const backdrop = document.querySelector('.modal-backdrop');
    const previewContainer = document.getElementById('preview-container');
    const previewTitle = document.getElementById('preview-title');
    const editFileBtn = document.getElementById('edit-file-btn');
    const previewActions = document.getElementById('preview-actions');
    const editActions = document.getElementById('edit-actions');
    const editContainer = document.getElementById('edit-container');
    
    // Store the current file key for edit operations
    previewModal.dataset.currentKey = key;

    if (!previewModal || !previewContainer || !previewTitle) {
        console.error('Preview elements not found');
        return;
    }
    
    // Reset UI state
    if (previewActions) previewActions.style.display = 'flex';
    if (editActions) editActions.style.display = 'none';
    if (editContainer) editContainer.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'block';
    if (editFileBtn) editFileBtn.style.display = 'none';

    try {
        // Show loading in preview container
        previewContainer.innerHTML = `
            <div class="pf-l-bullseye">
                <div class="pf-c-spinner" role="progressbar" aria-label="Loading preview">
                    <span class="pf-c-spinner__clipper"></span>
                    <span class="pf-c-spinner__lead-ball"></span>
                    <span class="pf-c-spinner__tail-ball"></span>
                </div>
            </div>
        `;
        // Re-trigger modal animation
        previewModal.style.animation = 'none';
        previewModal.offsetHeight; // force reflow
        previewModal.style.animation = '';
        previewModal.style.display = 'block';
        if (backdrop) backdrop.style.display = 'block';

        previewTitle.textContent = key.split('/').pop();

        log('Fetching file for preview:', key);
        const response = await fetch(`/bucket/download/${key}`);

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
            previewContainer.innerHTML = `<img src="${imageUrl}" alt="${key}" class="pf-c-image">`;
        } else {
            // Try as text for anything that might be readable
            log('Trying to preview as text');
            try {
                const text = await response.text();
                
                // Store the original text for editing
                previewModal.dataset.originalContent = text;

                if (text.length > 500000) {
                    // If file is too large, show only the beginning
                    previewContainer.innerHTML = `<pre>${escapeHtml(text.substring(0, 500000))}...\n\n[File truncated, too large to display completely]</pre>`;
                } else {
                    previewContainer.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
                    
                    // Show edit button if not in read-only mode and file is text-based
                    if (!appConfig.readOnlyMode && isTextFile(key)) {
                        const editFileBtn = document.getElementById('edit-file-btn');
                        if (editFileBtn) {
                            editFileBtn.style.display = 'block';
                            editFileBtn.onclick = () => switchToEditMode(text);
                        }
                    }
                }

                log('Text preview successful');
            } catch (textError) {
                log('Text preview failed:', textError);
                previewContainer.innerHTML = `
                    <div class="pf-c-empty-state">
                        <div class="pf-c-empty-state__content">
                            <i class="fas fa-file pf-c-empty-state__icon"></i>
                            <h2 class="pf-c-title pf-m-lg">Preview not available</h2>
                            <div class="pf-c-empty-state__body">
                                <p>Preview not available for this file type or content</p>
                            </div>
                        </div>
                    </div>`;
            }
        }
    } catch (error) {
        console.error('Error previewing file:', error);
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="pf-c-empty-state">
                    <div class="pf-c-empty-state__content">
                        <i class="fas fa-exclamation-triangle pf-c-empty-state__icon"></i>
                        <h2 class="pf-c-title pf-m-lg">Error</h2>
                        <div class="pf-c-empty-state__body">
                            <p>${error.message}</p>
                        </div>
                        <div class="pf-c-empty-state__primary">
                            <button class="pf-c-button pf-m-primary" onclick="downloadFile('${key}')">Download Instead</button>
                        </div>
                    </div>
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
        const response = await fetch(`/bucket/delete/${key}`, {
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
            fetch(`/bucket/delete/${key}`, {
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
        'sh', 'py',
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

// Update bucket info in the header
function updateBucketInfo() {
    const bucketInfoElement = document.getElementById('bucket-info');
    if (!bucketInfoElement) return;

    if (appConfig.demoMode) {
        bucketInfoElement.textContent = 'demo-bucket (sample data)';
    } else if (appConfig.bucketHost && appConfig.bucketName) {
        bucketInfoElement.textContent = `${appConfig.bucketHost} / ${appConfig.bucketName}`;
    }
}

// Update mode indicator
function updateModeIndicator() {
    const modeIndicator = document.getElementById('mode-indicator');
    if (!modeIndicator) return;

    if (appConfig.demoMode) {
        modeIndicator.className = 'mode-badge demo';
        modeIndicator.innerHTML = `
            <i class="fas fa-flask" aria-hidden="true"></i>
            Demo
        `;
    } else if (appConfig.readOnlyMode) {
        modeIndicator.className = 'mode-badge read-only';
        modeIndicator.innerHTML = `
            <i class="fas fa-lock" aria-hidden="true"></i>
            Read-Only
        `;
    } else {
        modeIndicator.className = 'mode-badge read-write';
        modeIndicator.innerHTML = `
            <i class="fas fa-edit" aria-hidden="true"></i>
            Read-Write
        `;
    }
}

// Apply saved theme preference on load
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateDarkModeButton(true);
    } else {
        updateDarkModeButton(false);
    }
}

// Toggle dark mode
function toggleDarkMode() {
    log('Dark mode toggle clicked');

    // Enable theme transition
    document.body.classList.add('theme-transitioning');

    // Get current state
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Toggle the state
    if (isDarkMode) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        updateDarkModeButton(false);
        log('Switched to light mode');
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateDarkModeButton(true);
        log('Switched to dark mode');
    }

    // Remove transition class after animation completes
    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
    }, 350);

    // Show notification for visual feedback
    showNotification(isDarkMode ? 'Light mode activated' : 'Dark mode activated', 'info');
}

// Update dark mode button appearance
function updateDarkModeButton(isDarkMode) {
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (!darkModeBtn) return;

    darkModeBtn.innerHTML = isDarkMode
        ? '<i class="fas fa-sun" aria-hidden="true"></i>'
        : '<i class="fas fa-moon" aria-hidden="true"></i>';
    darkModeBtn.title = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
}

// Check if a file is text-based and can be edited
function isTextFile(filename) {
    if (!filename) return false;

    const extension = filename.split('.').pop().toLowerCase();
    const textExtensions = [
        'txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts',
        'jsx', 'tsx', 'yml', 'yaml', 'ini', 'conf', 'cfg', 'log',
        'sh', 'bash', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
        'php', 'rb', 'pl', 'sql', 'go'
    ];

    return textExtensions.includes(extension);
}

// Switch to edit mode
function switchToEditMode(content) {
    const previewContainer = document.getElementById('preview-container');
    const editContainer = document.getElementById('edit-container');
    const fileEditor = document.getElementById('file-editor');
    const previewActions = document.getElementById('preview-actions');
    const editActions = document.getElementById('edit-actions');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (editContainer) editContainer.style.display = 'block';
    if (previewActions) previewActions.style.display = 'none';
    if (editActions) editActions.style.display = 'flex';
    
    if (fileEditor) {
        fileEditor.value = content;
        fileEditor.focus();
    }
    
    // Set up event listeners for edit actions
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveFileBtn = document.getElementById('save-file-btn');
    
    if (cancelEditBtn) {
        cancelEditBtn.onclick = cancelEdit;
    }
    
    if (saveFileBtn) {
        saveFileBtn.onclick = saveFile;
    }
}

// Cancel edit and return to preview mode
function cancelEdit() {
    const previewContainer = document.getElementById('preview-container');
    const editContainer = document.getElementById('edit-container');
    const previewActions = document.getElementById('preview-actions');
    const editActions = document.getElementById('edit-actions');
    
    if (previewContainer) previewContainer.style.display = 'block';
    if (editContainer) editContainer.style.display = 'none';
    if (previewActions) previewActions.style.display = 'flex';
    if (editActions) editActions.style.display = 'none';
}

// Save the edited file
async function saveFile() {
    const previewModal = document.getElementById('preview-modal');
    const fileEditor = document.getElementById('file-editor');
    const saveFileBtn = document.getElementById('save-file-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    if (!previewModal || !fileEditor) {
        console.error('Required elements not found');
        return;
    }
    
    const key = previewModal.dataset.currentKey;
    const content = fileEditor.value;
    
    if (!key) {
        console.error('No file key found');
        return;
    }
    
    log('Saving file:', key);
    
    // Disable buttons during save
    if (saveFileBtn) saveFileBtn.disabled = true;
    if (cancelEditBtn) cancelEditBtn.disabled = true;
    
    try {
        const response = await fetch(`/bucket/update/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: content
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save file: ${response.status} ${response.statusText}`);
        }
        
        // Update the original content
        previewModal.dataset.originalContent = content;
        
        // Update the preview
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
        }
        
        // Switch back to preview mode
        cancelEdit();
        
        // Show success notification
        showNotification('File saved successfully', 'success');
        
    } catch (error) {
        console.error('Error saving file:', error);
        showNotification(`Error saving file: ${error.message}`, 'danger');
    } finally {
        // Re-enable buttons
        if (saveFileBtn) saveFileBtn.disabled = false;
        if (cancelEditBtn) cancelEditBtn.disabled = false;
    }
}

// Show a notification
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'pf-c-alert pf-m-' + type;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        notification.style.maxWidth = '400px';
        document.body.appendChild(notification);
    } else {
        notification.className = 'pf-c-alert pf-m-' + type;
    }
    
    // Set notification content
    notification.innerHTML = `
        <div class="pf-c-alert__icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'}" aria-hidden="true"></i>
        </div>
        <h4 class="pf-c-alert__title">${message}</h4>
    `;
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
