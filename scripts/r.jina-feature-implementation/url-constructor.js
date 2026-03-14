/**
 * URL Constructor for r.jina.ai Integration
 * 
 * This script handles URL transformation for r.jina.ai integration in ClawChives.
 * It provides functions to prepend the r.jina.ai proxy prefix to URLs while
 * handling various URL formats and edge cases.
 * 
 * @author ClawChives Development Team
 * @version 1.0.0
 */

/**
 * Validates if a string is a valid URL
 * @param {string} url - The URL string to validate
 * @returns {boolean} - True if the URL is valid, false otherwise
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes a URL by ensuring it has a proper protocol prefix
 * @param {string} url - The URL to normalize
 * @returns {string} - The normalized URL with protocol
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided: must be a non-empty string');
  }

  // Trim whitespace
  url = url.trim();

  // Check if URL already has a protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Check if it's a relative URL that needs http://
  if (url.startsWith('//')) {
    return 'https:' + url;
  }

  // If no protocol, assume https://
  return 'https://' + url;
}

/**
 * Constructs an r.jina.ai URL from a given URL
 * @param {string} originalUrl - The original URL to transform
 * @returns {string} - The r.jina.ai proxy URL
 * @throws {Error} - If the URL is invalid or transformation fails
 */
function constructJinaUrl(originalUrl) {
  try {
    // Validate input
    if (!originalUrl || typeof originalUrl !== 'string') {
      throw new Error('Invalid URL provided: must be a non-empty string');
    }

    // Normalize the URL first
    const normalizedUrl = normalizeUrl(originalUrl);

    // Validate the normalized URL
    if (!isValidUrl(normalizedUrl)) {
      throw new Error(`Invalid URL format: ${originalUrl}`);
    }

    // Create the r.jina.ai URL by prepending the proxy prefix
    const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;

    return jinaUrl;
  } catch (error) {
    throw new Error(`Failed to construct r.jina.ai URL: ${error.message}`);
  }
}

/**
 * Batch processes multiple URLs for r.jina.ai transformation
 * @param {string[]} urls - Array of URLs to transform
 * @returns {Object} - Object containing successful transformations and errors
 */
function batchConstructJinaUrls(urls) {
  if (!Array.isArray(urls)) {
    throw new Error('Input must be an array of URLs');
  }

  const results = {
    successful: [],
    errors: []
  };

  urls.forEach((url, index) => {
    try {
      const jinaUrl = constructJinaUrl(url);
      results.successful.push({
        original: url,
        transformed: jinaUrl,
        index: index
      });
    } catch (error) {
      results.errors.push({
        original: url,
        error: error.message,
        index: index
      });
    }
  });

  return results;
}

/**
 * Validates if a URL is already an r.jina.ai URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's already an r.jina.ai URL
 */
function isJinaUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  return url.includes('r.jina.ai/');
}

/**
 * Extracts the original URL from an r.jina.ai URL
 * @param {string} jinaUrl - The r.jina.ai URL
 * @returns {string|null} - The original URL or null if extraction fails
 */
function extractOriginalUrl(jinaUrl) {
  if (!jinaUrl || typeof jinaUrl !== 'string') {
    return null;
  }

  if (!isJinaUrl(jinaUrl)) {
    return null;
  }

  try {
    // Extract the part after r.jina.ai/
    const match = jinaUrl.match(/r\.jina\.ai\/(.+)$/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Export functions for use in other modules
export {
  constructJinaUrl,
  batchConstructJinaUrls,
  normalizeUrl,
  isValidUrl,
  isJinaUrl,
  extractOriginalUrl
};

// If this script is run directly, provide a simple CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node url-constructor.js <url>');
    console.log('Example: node url-constructor.js https://example.com');
    process.exit(1);
  }

  try {
    const originalUrl = args[0];
    const jinaUrl = constructJinaUrl(originalUrl);
    console.log(`Original URL: ${originalUrl}`);
    console.log(`r.jina.ai URL: ${jinaUrl}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
