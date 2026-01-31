// URL transformation utility
function addCloudflareVariant(url, variant) {
  variant = variant || 'public';
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('imagedelivery.net')) return url;

  // Don't add variant if already present
  var knownVariants = ['public', 'thumbnail', 'avatar', 'hero', 'medium'];
  var hasVariant = knownVariants.some(function(v) {
    return url.endsWith('/' + v);
  });
  if (hasVariant) return url;

  return url + '/' + variant;
}

// Custom preview component
var CloudflareImagePreview = createClass({
  render: function () {
    var value = this.props.value;
    if (!value) return null;

    // Handle arrays (multiple images)
    if (Array.isArray(value) || (value && value.toJS)) {
      var items = Array.isArray(value) ? value : value.toJS();
      var self = this;
      return h('div', {},
        items.map(function(item, index) {
          return self.renderImage(item, index);
        })
      );
    }

    return this.renderImage(value, 0);
  },

  renderImage: function(value, key) {
    var src;

    if (value instanceof File) {
      src = URL.createObjectURL(value);
    } else if (typeof value === 'string') {
      src = addCloudflareVariant(value);
    } else {
      src = '';
    }

    return h('img', {
      key: key,
      src: src,
      style: { maxWidth: '100%', height: 'auto' }
    });
  }
});

window.CloudflareImagePreview = CloudflareImagePreview;
window.addCloudflareVariant = addCloudflareVariant;

// Auto-fix Cloudflare image URLs in the editor control
// Uses MutationObserver to detect images and transform URLs
(function() {
  function fixCloudflareImages() {
    // Find all images with Cloudflare URLs that don't have a variant
    var images = document.querySelectorAll('img[src*="imagedelivery.net"]');
    images.forEach(function(img) {
      var src = img.getAttribute('src');
      if (src && src.includes('imagedelivery.net')) {
        // Check if already has a variant
        var knownVariants = ['public', 'thumbnail', 'avatar', 'hero', 'medium'];
        var hasVariant = knownVariants.some(function(v) {
          return src.endsWith('/' + v);
        });
        if (!hasVariant) {
          // Use public variant for editor control previews
          img.setAttribute('src', src + '/public');
        }
      }
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixCloudflareImages);
  } else {
    fixCloudflareImages();
  }

  // Watch for new images being added to the DOM
  var observer = new MutationObserver(function(mutations) {
    var shouldFix = false;
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldFix = true;
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        shouldFix = true;
      }
    });
    if (shouldFix) {
      fixCloudflareImages();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });
})();
