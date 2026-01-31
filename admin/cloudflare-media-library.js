// Cloudflare Images Media Library for Decap CMS
// Follows the same pattern as decap-cms-media-library-cloudinary

async function init({ options = {}, handleInsert } = {}) {
  const config = options.config || {};
  const uploadEndpoint = config.uploadEndpoint || '/.netlify/functions/upload-image';

  return {
    show: function({ config: instanceConfig = {}, allowMultiple } = {}) {
      // Create modal overlay
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';

      // Create modal with orange top border
      var modal = document.createElement('div');
      modal.style.cssText = 'background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%; border-top: 6px solid #f68220;';

      modal.innerHTML = '<h2 style="margin-top: 0; color: #333;">Upload to Cloudflare Images</h2>' +
        '<div id="cf-drop-zone" style="margin: 20px 0; padding: 40px 20px; border: 2px dashed #f68220; border-radius: 8px; text-align: center; cursor: pointer; transition: border-color 0.2s, background-color 0.2s;">' +
        '<p style="margin: 0 0 10px 0; color: #666;">Drag & drop images here</p>' +
        '<p style="margin: 0; color: #999; font-size: 14px;">or click to select files</p>' +
        '<input type="file" id="cf-file-input" accept="image/*" ' + (allowMultiple ? 'multiple' : '') + ' style="display: none;">' +
        '</div>' +
        '<div id="cf-preview" style="margin: 15px 0; max-height: 200px; overflow-y: auto;"></div>' +
        '<div id="cf-progress" style="display: none; margin: 15px 0;">' +
        '<div style="background: #f0f0f0; border-radius: 4px; overflow: hidden;">' +
        '<div id="cf-progress-bar" style="background: #f68220; height: 20px; width: 0%; transition: width 0.3s;"></div>' +
        '</div>' +
        '<p id="cf-status" style="margin-top: 10px; font-size: 14px; color: #666;"></p>' +
        '</div>' +
        '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
        '<button id="cf-cancel" style="padding: 10px 20px; background: #e8e8e8; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
        '<button id="cf-upload" style="padding: 10px 20px; background: #ccc; color: #888; border: none; border-radius: 4px; cursor: not-allowed;" disabled title="Select an image first">Upload</button>' +
        '</div>';

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      var dropZone = document.getElementById('cf-drop-zone');
      var fileInput = document.getElementById('cf-file-input');
      var uploadBtn = document.getElementById('cf-upload');
      var cancelBtn = document.getElementById('cf-cancel');
      var preview = document.getElementById('cf-preview');
      var progress = document.getElementById('cf-progress');
      var progressBar = document.getElementById('cf-progress-bar');
      var status = document.getElementById('cf-status');

      var selectedFiles = [];

      function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function handleFiles(files) {
        selectedFiles = files;
        uploadBtn.disabled = selectedFiles.length === 0;
        if (selectedFiles.length > 0) {
          uploadBtn.style.background = '#f68220';
          uploadBtn.style.color = 'white';
          uploadBtn.style.cursor = 'pointer';
          uploadBtn.removeAttribute('title');
        } else {
          uploadBtn.style.background = '#ccc';
          uploadBtn.style.color = '#888';
          uploadBtn.style.cursor = 'not-allowed';
          uploadBtn.title = 'Select an image first';
        }

        preview.innerHTML = '';
        selectedFiles.forEach(function(file) {
          var item = document.createElement('div');
          item.style.cssText = 'display: flex; align-items: center; padding: 8px; background: #f5f5f5; margin: 5px 0; border-radius: 4px;';

          var thumb = document.createElement('div');
          thumb.style.cssText = 'width: 40px; height: 40px; margin-right: 10px; background-size: cover; background-position: center; border-radius: 4px;';

          var reader = new FileReader();
          reader.onload = function(e) {
            thumb.style.backgroundImage = 'url(' + e.target.result + ')';
          };
          reader.readAsDataURL(file);

          var info = document.createElement('div');
          info.innerHTML = '<div style="font-weight: 500;">' + escapeHtml(file.name) + '</div>' +
            '<div style="font-size: 12px; color: #666;">' + (file.size / 1024).toFixed(1) + ' KB</div>';

          item.appendChild(thumb);
          item.appendChild(info);
          preview.appendChild(item);
        });
      }

      // Click to select files
      dropZone.addEventListener('click', function() {
        fileInput.click();
      });

      // Drag and drop handlers
      dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#d66a10';
        dropZone.style.backgroundColor = '#fff8f0';
      });

      dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#f68220';
        dropZone.style.backgroundColor = 'transparent';
      });

      dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#f68220';
        dropZone.style.backgroundColor = 'transparent';

        var files = Array.from(e.dataTransfer.files).filter(function(file) {
          return file.type.startsWith('image/');
        });

        if (files.length > 0) {
          if (!allowMultiple) {
            files = [files[0]];
          }
          handleFiles(files);
        }
      });

      // Handle file selection
      fileInput.addEventListener('change', function(e) {
        var files = Array.from(e.target.files);
        handleFiles(files);
      });

      // Handle cancel
      cancelBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
      });

      // Close on overlay click
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });

      // Handle upload
      uploadBtn.addEventListener('click', function() {
        if (selectedFiles.length === 0) return;

        uploadBtn.disabled = true;
        cancelBtn.disabled = true;
        dropZone.style.pointerEvents = 'none';
        dropZone.style.opacity = '0.5';
        progress.style.display = 'block';

        var uploadedUrls = [];
        var currentIndex = 0;

        function uploadNext() {
          if (currentIndex >= selectedFiles.length) {
            progressBar.style.width = '100%';
            status.textContent = 'Upload complete!';
            status.style.color = '#f68220';

            setTimeout(function() {
              document.body.removeChild(overlay);
              // Call handleInsert with the URL(s)
              handleInsert(allowMultiple ? uploadedUrls : uploadedUrls[0]);
            }, 500);
            return;
          }

          var file = selectedFiles[currentIndex];
          status.textContent = 'Uploading ' + (currentIndex + 1) + ' of ' + selectedFiles.length + ': ' + file.name + '...';
          progressBar.style.width = ((currentIndex / selectedFiles.length) * 100) + '%';

          var formData = new FormData();
          formData.append('file', file);

          fetch(uploadEndpoint, {
            method: 'POST',
            body: formData
          })
          .then(function(response) {
            if (!response.ok) {
              return response.json().then(function(err) {
                throw new Error(err.error || 'Upload failed');
              });
            }
            return response.json();
          })
          .then(function(result) {
            uploadedUrls.push(result.url);
            currentIndex++;
            uploadNext();
          })
          .catch(function(error) {
            status.textContent = 'Error: ' + error.message;
            status.style.color = 'red';
            uploadBtn.disabled = false;
            cancelBtn.disabled = false;
            dropZone.style.pointerEvents = 'auto';
            dropZone.style.opacity = '1';
          });
        }

        uploadNext();
      });
    },

    hide: function() {
      var overlay = document.querySelector('div[style*="z-index: 10000"]');
      if (overlay) {
        document.body.removeChild(overlay);
      }
    },

    enableStandalone: function() {
      return false;
    }
  };
}

// Export as the same structure as cloudinary: { name, init }
window.CloudflareMediaLibrary = {
  name: 'cloudflare-images',
  init: init
};
