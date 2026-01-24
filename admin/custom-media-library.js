// Custom R2 Upload Widget for Decap CMS
(function() {
  const UPLOAD_ENDPOINT = '/.netlify/functions/r2-upload/base/';
  
  class R2MediaLibrary {
    constructor() {
      this.name = 'r2-uploader';
    }

    show({ value, config, allowMultiple, imagesOnly }) {
      return new Promise((resolve, reject) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
        `;

        modal.innerHTML = `
          <h2 style="margin-top: 0;">Upload Image to R2</h2>
          <div style="margin: 20px 0;">
            <input type="file" id="r2-file-input" accept="image/*" ${allowMultiple ? 'multiple' : ''} 
                   style="display: block; margin-bottom: 15px; padding: 10px; border: 2px dashed #ccc; width: 100%; cursor: pointer;">
            <div id="r2-preview" style="margin: 15px 0; max-height: 200px; overflow-y: auto;"></div>
            <div id="r2-progress" style="display: none; margin: 15px 0;">
              <div style="background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                <div id="r2-progress-bar" style="background: #4CAF50; height: 20px; width: 0%; transition: width 0.3s;"></div>
              </div>
              <p id="r2-status" style="margin-top: 10px; font-size: 14px; color: #666;"></p>
            </div>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="r2-cancel" style="padding: 10px 20px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button id="r2-upload" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;" disabled>Upload</button>
          </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const fileInput = document.getElementById('r2-file-input');
        const uploadBtn = document.getElementById('r2-upload');
        const cancelBtn = document.getElementById('r2-cancel');
        const preview = document.getElementById('r2-preview');
        const progress = document.getElementById('r2-progress');
        const progressBar = document.getElementById('r2-progress-bar');
        const status = document.getElementById('r2-status');

        let selectedFiles = [];

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
          selectedFiles = Array.from(e.target.files);
          uploadBtn.disabled = selectedFiles.length === 0;
          
          // Show preview
          preview.innerHTML = '';
          selectedFiles.forEach(file => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 8px; background: #f5f5f5; margin: 5px 0; border-radius: 4px;';
            item.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            preview.appendChild(item);
          });
        });

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
          document.body.removeChild(overlay);
          reject(new Error('User cancelled upload'));
        });

        // Handle upload
        uploadBtn.addEventListener('click', async () => {
          if (selectedFiles.length === 0) return;

          uploadBtn.disabled = true;
          cancelBtn.disabled = true;
          fileInput.disabled = true;
          progress.style.display = 'block';

          try {
            const uploadedUrls = [];
            
            for (let i = 0; i < selectedFiles.length; i++) {
              const file = selectedFiles[i];
              status.textContent = `Uploading ${i + 1} of ${selectedFiles.length}: ${file.name}...`;
              progressBar.style.width = `${((i / selectedFiles.length) * 100)}%`;

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
              uploadedUrls.push(result.original_file_url || result.url);
            }

            progressBar.style.width = '100%';
            status.textContent = 'Upload complete!';

            setTimeout(() => {
              document.body.removeChild(overlay);
              resolve(allowMultiple ? uploadedUrls : uploadedUrls[0]);
            }, 500);

          } catch (error) {
            status.textContent = `Error: ${error.message}`;
            status.style.color = 'red';
            uploadBtn.disabled = false;
            cancelBtn.disabled = false;
            fileInput.disabled = false;
          }
        });
      });
    }
  }

  // Register the custom media library
  if (window.CMS) {
    window.CMS.registerMediaLibrary(new R2MediaLibrary());
  }
})();