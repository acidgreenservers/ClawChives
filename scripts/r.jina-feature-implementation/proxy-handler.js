/**
 * Proxy Handler for r.jina.ai Integration
 * 
 * This script implements the proxy functionality for fetching content from r.jina.ai URLs.
 * It handles HTTP requests to r.jina.ai URLs with proper error handling, logging,
 * and response processing for integration with ClawChives bookmark manager.
 * 
 * @author ClawChives Development Team
 * @version 1.0.0
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configuration constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Logger utility for consistent logging format
 */
const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },
  error: (message, error = null) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
  }
};

/**
 * Validates if a URL is a valid r.jina.ai URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid r.jina.ai URL
 */
function isValidJinaUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'r.jina.ai' && parsedUrl.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Creates an HTTP request options object for the given URL
 * @param {string} url - The URL to create options for
 * @returns {Object} - HTTP request options
 */
function createRequestOptions(url) {
  const parsedUrl = new URL(url);
  
  return {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {
      'User-Agent': 'ClawChives/1.0.0 (+https://github.com/acidgreenservers/ClawChives)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    },
    timeout: DEFAULT_TIMEOUT
  };
}

/**
 * Makes an HTTP request with retry logic
 * @param {string} url - The URL to fetch
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Object>} - Promise resolving to response data
 */
function makeRequestWithRetry(url, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const options = createRequestOptions(url);
    const client = options.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let rawData = '';
      
      // Handle response data
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: rawData,
            success: true
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`));
        }
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    // Handle timeout
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    // Set timeout
    req.setTimeout(DEFAULT_TIMEOUT);
    
    // End the request
    req.end();
  }).catch(async (error) => {
    if (retries > 0) {
      logger.warn(`Request failed, retrying (${retries} attempts left): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return makeRequestWithRetry(url, retries - 1);
    }
    throw error;
  });
}

/**
 * Fetches content from an r.jina.ai URL
 * @param {string} jinaUrl - The r.jina.ai URL to fetch content from
 * @returns {Promise<Object>} - Promise resolving to fetch result
 */
async function fetchJinaContent(jinaUrl) {
  try {
    // Validate input
    if (!jinaUrl || typeof jinaUrl !== 'string') {
      throw new Error('Invalid URL provided: must be a non-empty string');
    }
    
    // Validate URL format
    if (!isValidJinaUrl(jinaUrl)) {
      throw new Error('Invalid r.jina.ai URL format');
    }
    
    logger.info('Fetching content from r.jina.ai', { url: jinaUrl });
    
    // Make the request
    const response = await makeRequestWithRetry(jinaUrl);
    
    // Process the response
    const result = {
      success: true,
      statusCode: response.statusCode,
      content: response.data,
      headers: response.headers,
      fetchedAt: new Date().toISOString(),
      originalUrl: jinaUrl
    };
    
    logger.info('Successfully fetched content', { 
      statusCode: response.statusCode,
      contentLength: response.data.length 
    });
    
    return result;
    
  } catch (error) {
    const errorMessage = `Failed to fetch content from r.jina.ai: ${error.message}`;
    logger.error(errorMessage, { url: jinaUrl });
    
    return {
      success: false,
      error: errorMessage,
      originalUrl: jinaUrl,
      fetchedAt: new Date().toISOString()
    };
  }
}

/**
 * Fetches content from multiple r.jina.ai URLs
 * @param {string[]} jinaUrls - Array of r.jina.ai URLs to fetch
 * @returns {Promise<Object>} - Promise resolving to batch fetch results
 */
async function fetchMultipleJinaContent(jinaUrls) {
  if (!Array.isArray(jinaUrls)) {
    throw new Error('Input must be an array of URLs');
  }
  
  const results = {
    successful: [],
    failed: [],
    total: jinaUrls.length,
    startTime: new Date().toISOString()
  };
  
  logger.info(`Starting batch fetch for ${jinaUrls.length} URLs`);
  
  // Process URLs sequentially to avoid overwhelming the server
  for (let i = 0; i < jinaUrls.length; i++) {
    const url = jinaUrls[i];
    logger.info(`Processing URL ${i + 1}/${jinaUrls.length}: ${url}`);
    
    try {
      const result = await fetchJinaContent(url);
      
      if (result.success) {
        results.successful.push(result);
      } else {
        results.failed.push(result);
      }
    } catch (error) {
      results.failed.push({
        success: false,
        error: error.message,
        originalUrl: url,
        fetchedAt: new Date().toISOString()
      });
    }
  }
  
  results.endTime = new Date().toISOString();
  results.duration = new Date(results.endTime) - new Date(results.startTime);
  
  logger.info('Batch fetch completed', {
    successful: results.successful.length,
    failed: results.failed.length,
    duration: `${results.duration}ms`
  });
  
  return results;
}

/**
 * Validates and processes a URL for r.jina.ai fetching
 * @param {string} url - The original URL to process
 * @param {Object} urlConstructor - The URL constructor module
 * @returns {Promise<Object>} - Promise resolving to processed URL result
 */
async function processUrlForJina(url, urlConstructor = null) {
  try {
    if (!urlConstructor) {
      // Dynamically import the url-constructor module
      const urlConstructorModule = await import('./url-constructor.js');
      urlConstructor = urlConstructorModule;
    }
    
    // Construct the r.jina.ai URL
    const jinaUrl = urlConstructor.constructJinaUrl(url);
    
    // Fetch content from the r.jina.ai URL
    const result = await fetchJinaContent(jinaUrl);
    
    return {
      ...result,
      originalUrl: url,
      jinaUrl: jinaUrl
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Failed to process URL: ${error.message}`,
      originalUrl: url
    };
  }
}

/**
 * Health check for r.jina.ai service
 * @returns {Promise<boolean>} - Promise resolving to service availability
 */
async function checkJinaServiceHealth() {
  try {
    const testUrl = 'https://r.jina.ai/http://example.com';
    const result = await fetchJinaContent(testUrl);
    
    return result.success;
  } catch (error) {
    logger.error('Service health check failed', error);
    return false;
  }
}

// Export functions for use in other modules
export {
  fetchJinaContent,
  fetchMultipleJinaContent,
  processUrlForJina,
  checkJinaServiceHealth,
  isValidJinaUrl,
  logger
};

// If this script is run directly, provide a simple CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node proxy-handler.js <url>');
    console.log('Example: node proxy-handler.js https://r.jina.ai/https://example.com');
    process.exit(1);
  }
  
  const url = args[0];
  
  (async () => {
    try {
      const result = await fetchJinaContent(url);
      
      if (result.success) {
        console.log('✅ Success!');
        console.log(`Status: ${result.statusCode}`);
        console.log(`Content length: ${result.content.length} characters`);
        console.log('First 200 characters of content:');
        console.log(result.content.substring(0, 200) + '...');
      } else {
        console.log('❌ Failed!');
        console.log(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    }
  })();
}
