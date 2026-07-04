/**
 * cURL command parser
 * Parses a standard cURL command string into structured request parameters
 */

/**
 * Parsed request object
 * @typedef {Object} ParsedRequest
 * @property {string} url - Request URL
 * @property {string} method - HTTP method
 * @property {Object<string,string>} headers - Request headers
 * @property {string|null} body - Request body
 */

/**
 * Parse a cURL command string
 * @param {string} curlCommand - cURL command text
 * @returns {ParsedRequest}
 * @throws {Error} Thrown when the command format is invalid
 */
function parseCurlCommand(curlCommand) {
  if (!curlCommand || typeof curlCommand !== 'string') {
    throw new Error('cURL command cannot be empty');
  }

  const trimmed = curlCommand.trim();
  if (!trimmed.startsWith('curl ')) {
    throw new Error('Command must start with curl');
  }

  // Extract URL (supports single and double quotes)
  const urlMatch = trimmed.match(/curl\s+(?:'([^']+)'|"([^"]+)"|(\S+))/);
  if (!urlMatch) {
    throw new Error('Unable to parse request URL');
  }
  const url = urlMatch[1] || urlMatch[2] || urlMatch[3];
  if (!url || !url.startsWith('http')) {
    throw new Error('Invalid request URL: ' + url);
  }

  // Extract HTTP method (defaults to GET, POST if --data present)
  const methodMatch = trimmed.match(/-X\s+(?:'([^']+)'|"([^"]+)"|(\w+))/);
  let method = methodMatch
    ? (methodMatch[1] || methodMatch[2] || methodMatch[3]).toUpperCase()
    : 'GET';

  // Extract headers (supports single and double quotes)
  const headers = {};
  const headerRegex = /-H\s+(?:'([^']+)'|"([^"]+)")/g;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(trimmed)) !== null) {
    const headerStr = headerMatch[1] || headerMatch[2];
    const colonIndex = headerStr.indexOf(':');
    if (colonIndex > 0) {
      const key = headerStr.substring(0, colonIndex).trim();
      const value = headerStr.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  // Extract request body (supports --data, --data-raw, --data-binary)
  const dataMatch = trimmed.match(/--data(?:-raw|-binary)?\s+(?:'([^']+)'|"([^"]+)")/);
  const body = dataMatch ? (dataMatch[1] || dataMatch[2]) : null;

  // Default to POST when body is present
  if (body && method === 'GET') {
    method = 'POST';
  }

  return { url, method, headers, body };
}

// Export (supports ES Module and global)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseCurlCommand };
}
