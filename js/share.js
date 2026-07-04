/**
 * Share link module
 * Generates, copies and opens share links
 */

const ShareService = (() => {
  /**
   * Base64 encode a cURL command (with Unicode support)
   * @param {string} curlCommand
   * @returns {string}
   */
  function encodeCommand(curlCommand) {
    try {
      return btoa(unescape(encodeURIComponent(curlCommand)));
    } catch {
      return btoa(curlCommand);
    }
  }

  /**
   * Decode a base64 encoded command
   * @param {string} encoded
   * @returns {string}
   */
  function decodeCommand(encoded) {
    try {
      return decodeURIComponent(escape(atob(encoded)));
    } catch {
      return atob(encoded);
    }
  }

  /**
   * Generate a shareable URL from a cURL command
   * @param {string} curlCommand - Raw cURL command
   * @returns {string} Full shareable URL
   */
  function generateShareUrl(curlCommand) {
    if (!curlCommand || !curlCommand.trim()) {
      throw new Error('Command cannot be empty');
    }
    const baseUrl = window.location.href.split('?')[0];
    const encoded = encodeCommand(curlCommand.trim());
    return `${baseUrl}?c=${encoded}`;
  }

  /**
   * Extract shared command from current URL
   * @returns {string|null} Decoded command, or null if not found
   */
  function getCommandFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('c');
    if (!encoded) return null;
    return decodeCommand(encoded);
  }

  /**
   * Copy text to clipboard
   * @param {string} text
   * @returns {Promise<boolean>} Whether the copy succeeded
   */
  async function copyToClipboard(text) {
    if (!navigator.clipboard) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
    await navigator.clipboard.writeText(text);
    return true;
  }

  return {
    generateShareUrl,
    getCommandFromUrl,
    copyToClipboard,
  };
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShareService;
}
