/**
 * API service module
 * Handles door unlock requests and Bark push notifications
 */

const ApiService = (() => {
  const config = window.AppConfig;

  /**
   * Get config values with fallback defaults
   */
  function getConfig() {
    return {
      barkApiBase: (config && config.barkApiBase) || '',
      requestTimeout: (config && config.requestTimeout) || 15000,
    };
  }

  /**
   * Fetch wrapper with timeout support
   * @param {string} url
   * @param {RequestInit} options
   * @param {number} timeout
   * @returns {Promise<Response>}
   */
  async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Execute a door unlock request
   * @param {import('./curl-parser.js').ParsedRequest} request - Parsed request params
   * @returns {Promise<Object|null>} API response JSON
   * @throws {Error} Thrown on request failure
   */
  async function executeRequest(request) {
    const { requestTimeout } = getConfig();

    const fetchOptions = {
      method: request.method,
      headers: request.headers,
    };

    if (request.body) {
      // Validate body is valid JSON
      try {
        JSON.parse(request.body);
        fetchOptions.body = request.body;
      } catch {
        fetchOptions.body = request.body;
      }
    }

    const response = await fetchWithTimeout(request.url, fetchOptions, requestTimeout);

    if (!response.ok) {
      throw new Error(`Request failed (HTTP ${response.status}): ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return { raw: await response.text() };
  }

  /**
   * Send Bark push notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @returns {Promise<void>}
   */
  async function sendBarkNotification(title, body) {
    const { barkApiBase } = getConfig();
    if (!barkApiBase) {
      console.warn('Bark API not configured, skipping notification');
      return;
    }

    try {
      const content = title + (body ? '\n' + body : '');
      await fetchWithTimeout(
        barkApiBase + encodeURIComponent(content),
        { method: 'GET' },
        5000
      );
    } catch (error) {
      // Bark notification failure should not block the main flow
      console.warn('Bark notification failed:', error.message);
    }
  }

  return {
    executeRequest,
    sendBarkNotification,
  };
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
}
