// Custom R2 Upload Widget for Decap CMS
var R2MediaLibrary = {
  name: 'r2-uploader',
  
  init: function() {
    // Initialization (required by CMS)
  },
  
  show: function(options) {
    var resolve = options.resolve;
    var reject = options.reject;
    var allowMultiple = options.allowMultiple || false;
    var UPLOAD_ENDPOINT = '/.netlify/functions/r2-upload/base/';
    
    // Create modal overlay
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';

    // Create modal
    var modal = document.createElement('div');
    modal.style.cssText = 'background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;';

    modal.innerHTML = '<h2 style="margin-top: 0;">Upload Image to R2</h2>' +
      '<div style="margin: 20px 0;">' +
      '<input type="file" id="r2-file-input" accept="image/*" ' + (allowMultiple ? 'multiple' : '') + ' style="display: block; margin-bottom: 15px; padding: 10px; border: 2px dashed #ccc; width: 100%; cursor: pointer;">' +
      '<div id="r2-preview" style="margin: 15px 0; max-height: 200px; overflow-y: auto;"></div>' +
      '<div id="r2-progress" style="display: none; margin: 15px 0;">' +
      '<div style="background: #f0f0f0; border-radius: 4px; overflow: hidden;">' +
      '<div id="r2-progress-bar" style="background: #4CAF50; height: 20px; width: 0%; transition: width 0.3s;"></div>' +
      '</div>' +
      '<p id="r2-status" style="margin-top: 10px; font-size: 14px; color: #666;"></p>' +
      '</div>' +
      '</div>' +
      '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
      '<button id="r2-cancel" style="padding: 10px 20px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>' +
      '<button id="r2-upload" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;" disabled>Upload</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var fileInput = document.getElementById('r2-file-input');
    var uploadBtn = document.getElementById('r2-upload');
    var cancelBtn = document.getElementById('r2-cancel');
    var preview = document.getElementById('r2-preview');
    var progress = document.getElementById('r2-progress');
    var progressBar = document.getElementById('r2-progress-bar');
    var status = document.getElementById('r2-status');

    var selectedFiles = [];

    // Handle file selection
    fileInput.addEventListener('change', function(e) {
      selectedFiles = Array.from(e.target.files);
      uploadBtn.disabled = selectedFiles.length === 0;
      
      preview.innerHTML = '';
      selectedFiles.forEach(function(file) {
        var item = document.createElement('div');
        item.style.cssText = 'padding: 8px; background: #f5f5f5; margin: 5px 0; border-radius: 4px;';
        item.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        preview.appendChild(item);
      });
    });

    // Handle cancel
    cancelBtn.addEventListener('click', function() {
      document.body.removeChild(overlay);
      reject('User cancelled');
    });

    // Handle upload
    uploadBtn.addEventListener('click', function() {
      if (selectedFiles.length === 0) return;

      uploadBtn.disabled = true;
      cancelBtn.disabled = true;
      fileInput.disabled = true;
      progress.style.display = 'block';

      var uploadedUrls = [];
      var currentIndex = 0;

      function uploadNext() {
        if (currentIndex >= selectedFiles.length) {
          progressBar.style.width = '100%';
          status.textContent = 'Upload complete!';
          
          setTimeout(function() {
            document.body.removeChild(overlay);
            resolve(allowMultiple ? uploadedUrls : uploadedUrls[0]);
          }, 500);
          return;
        }

        var file = selectedFiles[currentIndex];
        status.textContent = 'Uploading ' + (currentIndex + 1) + ' of ' + selectedFiles.length + ': ' + file.name + '...';
        progressBar.style.width = ((currentIndex / selectedFiles.length) * 100) + '%';

        var formData = new FormData();
        formData.append('file', file);

        fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          body: formData
        })
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Upload failed: ' + response.statusText);
          }
          return response.json();
        })
        .then(function(result) {
          uploadedUrls.push(result.original_file_url || result.url);
          currentIndex++;
          uploadNext();
        })
        .catch(function(error) {
          status.textContent = 'Error: ' + error.message;
          status.style.color = 'red';
          uploadBtn.disabled = false;
          cancelBtn.disabled = false;
          fileInput.disabled = false;
        });
      }

      uploadNext();
    });
  }
};

// Register the media library
if (window.CMS) {
  CMS.registerMediaLibrary(R2MediaLibrary);
}