// Cloudflare Images Media Library Widget for DecapCMS
(function() {
  const UPLOAD_ENDPOINT = '/.netlify/functions/cloudflare-images-upload/upload';

  class CloudflareImagesMediaLibrary {
    constructor(config = {}) {
      this.config = config;
      this.show = this.show.bind(this);
      this.hide = this.hide.bind(this);
      this.enableStandalone = this.enableStandalone.bind(this);
    }

    // Called when media library is opened
    show(options = {}) {
      this.options = options;
      const { allowMultiple = false, forImage = true } = options;

      this.createModal(allowMultiple);
    }

    // Hide modal
    hide() {
      const modal = document.getElementById('cf-images-modal');
      if (modal) {
        modal.remove();
      }
    }

    // Required by DecapCMS for standalone mode
    enableStandalone() {
      return true;
    }

    createModal(allowMultiple) {
      // Remove existing modal if any
      this.hide();

      const modal = document.createElement('div');
      modal.id = 'cf-images-modal';
      modal.innerHTML = `
        <style>
          #cf-images-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .cf-modal-content {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
          }
          .cf-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .cf-modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }
          .cf-close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
          }
          .cf-close-btn:hover {
            color: #333;
          }
          .cf-dropzone {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: border-color 0.2s, background-color 0.2s;
          }
          .cf-dropzone:hover, .cf-dropzone.dragover {
            border-color: #0077cc;
            background-color: #f0f7ff;
          }
          .cf-dropzone-text {
            color: #666;
            margin-bottom: 10px;
          }
          .cf-file-input {
            display: none;
          }
          .cf-browse-btn {
            background: #0077cc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .cf-browse-btn:hover {
            background: #0066b3;
          }
          .cf-upload-list {
            margin-top: 20px;
          }
          .cf-upload-item {
            display: flex;
            align-items: center;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .cf-upload-name {
            flex: 1;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .cf-upload-status {
            font-size: 12px;
            margin-left: 10px;
          }
          .cf-upload-status.uploading {
            color: #0077cc;
          }
          .cf-upload-status.success {
            color: #28a745;
          }
          .cf-upload-status.error {
            color: #dc3545;
          }
          .cf-progress {
            width: 100px;
            height: 4px;
            background: #ddd;
            border-radius: 2px;
            margin-left: 10px;
            overflow: hidden;
          }
          .cf-progress-bar {
            height: 100%;
            background: #0077cc;
            transition: width 0.2s;
          }
        </style>
        <div class="cf-modal-content">
          <div class="cf-modal-header">
            <h2 class="cf-modal-title">Upload Image${allowMultiple ? 's' : ''}</h2>
            <button class="cf-close-btn" type="button">&times;</button>
          </div>
          <div class="cf-dropzone" id="cf-dropzone">
            <p class="cf-dropzone-text">Drag and drop image${allowMultiple ? 's' : ''} here, or</p>
            <button class="cf-browse-btn" type="button">Browse Files</button>
            <input type="file" class="cf-file-input" id="cf-file-input" accept="image/*" ${allowMultiple ? 'multiple' : ''}>
          </div>
          <div class="cf-upload-list" id="cf-upload-list"></div>
        </div>
      `;

      document.body.appendChild(modal);
      this.setupEventListeners(modal, allowMultiple);
    }

    setupEventListeners(modal, allowMultiple) {
      const closeBtn = modal.querySelector('.cf-close-btn');
      const dropzone = modal.querySelector('#cf-dropzone');
      const fileInput = modal.querySelector('#cf-file-input');
      const browseBtn = modal.querySelector('.cf-browse-btn');

      // Close modal
      closeBtn.addEventListener('click', () => {
        this.hide();
        if (this.options.handleCloseMediaLibrary) {
          this.options.handleCloseMediaLibrary();
        }
      });

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hide();
          if (this.options.handleCloseMediaLibrary) {
            this.options.handleCloseMediaLibrary();
          }
        }
      });

      // Browse button
      browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });

      // File input change
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          this.handleFiles(files, allowMultiple);
        }
      });

      // Drag and drop
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
          this.handleFiles(allowMultiple ? files : [files[0]], allowMultiple);
        }
      });
    }

    async handleFiles(files, allowMultiple) {
      const uploadList = document.getElementById('cf-upload-list');
      const uploadedUrls = [];

      for (const file of files) {
        const itemId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add upload item to list
        const item = document.createElement('div');
        item.className = 'cf-upload-item';
        item.id = itemId;
        item.innerHTML = `
          <span class="cf-upload-name">${file.name}</span>
          <span class="cf-upload-status uploading">Uploading...</span>
          <div class="cf-progress"><div class="cf-progress-bar" style="width: 0%"></div></div>
        `;
        uploadList.appendChild(item);

        try {
          const url = await this.uploadFile(file, itemId);
          uploadedUrls.push({ url, name: file.name });

          // Update status
          const statusEl = item.querySelector('.cf-upload-status');
          statusEl.className = 'cf-upload-status success';
          statusEl.textContent = 'Done';
          item.querySelector('.cf-progress').style.display = 'none';
        } catch (error) {
          console.error('Upload error:', error);
          const statusEl = item.querySelector('.cf-upload-status');
          statusEl.className = 'cf-upload-status error';
          statusEl.textContent = 'Failed';
          item.querySelector('.cf-progress').style.display = 'none';
        }
      }

      // Return URLs to CMS
      if (uploadedUrls.length > 0 && this.options.handleInsert) {
        // Small delay to show success state
        setTimeout(() => {
          if (allowMultiple) {
            this.options.handleInsert(uploadedUrls.map(u => u.url));
          } else {
            this.options.handleInsert(uploadedUrls[0].url);
          }
          this.hide();
        }, 500);
      }
    }

    async uploadFile(file, itemId) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update progress to 100%
      const progressBar = document.querySelector(`#${itemId} .cf-progress-bar`);
      if (progressBar) {
        progressBar.style.width = '100%';
      }

      return result.url;
    }
  }

  // Register with DecapCMS
  if (window.CMS) {
    window.CMS.registerMediaLibrary(CloudflareImagesMediaLibrary, { name: 'cloudflare-images' });
  }

  // Export for manual registration if needed
  window.CloudflareImagesMediaLibrary = CloudflareImagesMediaLibrary;
})();
