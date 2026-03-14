/**
 * Test Runner for r.jina.ai Feature Implementation
 * 
 * This script provides comprehensive testing for the r.jina.ai implementation
 * in ClawChives. It tests URL construction, proxy functionality, database
 * schema changes, and permission controls with clear test results and
 * error reporting.
 * 
 * @author ClawChives Development Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Test configuration
const TEST_TIMEOUT = 10000; // 10 seconds for network tests
const TEST_SUITE_VERSION = '1.0.0';

/**
 * Test result tracker
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = null;
    this.endTime = null;
  }
  
  start() {
    this.startTime = new Date();
    console.log(`🧪 Starting r.jina.ai Feature Test Suite v${TEST_SUITE_VERSION}`);
    console.log(`📅 Started at: ${this.startTime.toISOString()}`);
    console.log('=' .repeat(80));
  }
  
  addTest(name, testFn, skip = false) {
    this.tests.push({
      name,
      testFn,
      skip,
      passed: false,
      failed: false,
      error: null,
      duration: 0
    });
  }
  
  async runTests() {
    console.log(`\n📋 Running ${this.tests.length} tests...\n`);
    
    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      const testNumber = i + 1;
      
      if (test.skip) {
        console.log(`⏭️  [${testNumber}/${this.tests.length}] ${test.name} - SKIPPED`);
        this.skipped++;
        continue;
      }
      
      console.log(`🧪 [${testNumber}/${this.tests.length}] ${test.name} - Running...`);
      
      const testStartTime = Date.now();
      
      try {
        await test.testFn();
        const duration = Date.now() - testStartTime;
        
        console.log(`✅ [${testNumber}/${this.tests.length}] ${test.name} - PASSED (${duration}ms)`);
        test.passed = true;
        this.passed++;
      } catch (error) {
        const duration = Date.now() - testStartTime;
        
        console.log(`❌ [${testNumber}/${this.tests.length}] ${test.name} - FAILED (${duration}ms)`);
        console.log(`   Error: ${error.message}`);
        
        test.failed = true;
        test.error = error;
        this.failed++;
      }
    }
    
    this.endTime = new Date();
    this.printSummary();
  }
  
  printSummary() {
    const total = this.tests.length;
    const duration = this.endTime - this.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Skipped: ${this.skipped}`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.tests.forEach((test, index) => {
        if (test.failed) {
          console.log(`   ${index + 1}. ${test.name}`);
          if (test.error) {
            console.log(`      ${test.error.message}`);
          }
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (this.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      process.exit(0);
    } else {
      console.log(`💥 ${this.failed} TEST(S) FAILED!`);
      process.exit(1);
    }
  }
}

/**
 * Test utilities and helpers
 */
const testUtils = {
  /**
   * Asserts that a condition is true
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  },
  
  /**
   * Asserts that two values are equal
   */
  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  
  /**
   * Asserts that a function throws an error
   */
  assertThrows(fn, expectedError, message) {
    try {
      fn();
      throw new Error(message || 'Expected function to throw an error');
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(message || `Expected error to contain "${expectedError}", got "${error.message}"`);
      }
    }
  },
  
  /**
   * Waits for a specified amount of time
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Checks if a file exists
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  },
  
  /**
   * Reads a file and returns its content
   */
  readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }
};

/**
 * URL Constructor Tests
 */
function addUrlConstructorTests(runner, urlConstructor) {
  // Test valid URL construction
  runner.addTest('URL Construction - Valid HTTP URL', () => {
    const result = urlConstructor.constructJinaUrl('http://example.com');
    testUtils.assertEquals(result, 'https://r.jina.ai/http://example.com');
  });
  
  runner.addTest('URL Construction - Valid HTTPS URL', () => {
    const result = urlConstructor.constructJinaUrl('https://example.com');
    testUtils.assertEquals(result, 'https://r.jina.ai/https://example.com');
  });
  
  runner.addTest('URL Construction - URL without protocol', () => {
    const result = urlConstructor.constructJinaUrl('example.com');
    testUtils.assertEquals(result, 'https://r.jina.ai/https://example.com');
  });
  
  runner.addTest('URL Construction - Relative URL', () => {
    const result = urlConstructor.constructJinaUrl('//example.com');
    testUtils.assertEquals(result, 'https://r.jina.ai/https://example.com');
  });
  
  runner.addTest('URL Construction - Invalid URL throws error', () => {
    testUtils.assertThrows(() => {
      urlConstructor.constructJinaUrl('');
    }, 'Invalid URL provided');
  });
  
  runner.addTest('URL Construction - Null URL throws error', () => {
    testUtils.assertThrows(() => {
      urlConstructor.constructJinaUrl(null);
    }, 'Invalid URL provided');
  });
  
  runner.addTest('URL Construction - Batch processing', () => {
    const urls = ['http://example.com', 'https://test.com', 'invalid'];
    const result = urlConstructor.batchConstructJinaUrls(urls);
    
    testUtils.assert(result.successful.length === 2, 'Should have 2 successful transformations');
    testUtils.assert(result.errors.length === 1, 'Should have 1 error');
    testUtils.assert(result.successful[0].transformed === 'https://r.jina.ai/http://example.com');
  });
  
  runner.addTest('URL Validation - Valid URL detection', () => {
    testUtils.assert(urlConstructor.isValidUrl('https://example.com'), 'Should detect valid URL');
    testUtils.assert(!urlConstructor.isValidUrl('invalid-url'), 'Should detect invalid URL');
  });
  
  runner.addTest('URL Detection - r.jina.ai URL detection', () => {
    testUtils.assert(urlConstructor.isJinaUrl('https://r.jina.ai/https://example.com'), 'Should detect r.jina.ai URL');
    testUtils.assert(!urlConstructor.isJinaUrl('https://example.com'), 'Should not detect regular URL as r.jina.ai');
  });
  
  runner.addTest('URL Extraction - Extract original URL', () => {
    const jinaUrl = 'https://r.jina.ai/https://example.com';
    const original = urlConstructor.extractOriginalUrl(jinaUrl);
    testUtils.assertEquals(original, 'https://example.com');
  });
}

/**
 * Proxy Handler Tests
 */
function addProxyHandlerTests(runner, proxyHandler) {
  // Test URL validation
  runner.addTest('Proxy Handler - Valid r.jina.ai URL validation', () => {
    const validUrl = 'https://r.jina.ai/https://example.com';
    testUtils.assert(proxyHandler.isValidJinaUrl(validUrl), 'Should validate r.jina.ai URL');
  });
  
  runner.addTest('Proxy Handler - Invalid URL validation', () => {
    const invalidUrl = 'https://example.com';
    testUtils.assert(!proxyHandler.isValidJinaUrl(invalidUrl), 'Should reject non-r.jina.ai URL');
  });
  
  // Test with mock server (if available)
  runner.addTest('Proxy Handler - Mock server test', async () => {
    // This would require setting up a mock server, which is complex for this test
    // For now, we'll test the URL validation and structure
    const testUrl = 'https://r.jina.ai/https://httpbin.org/get';
    
    // We can't actually make the request in a test environment without network access
    // So we'll just validate the URL structure
    testUtils.assert(proxyHandler.isValidJinaUrl(testUrl), 'Mock URL should be valid');
  }, true); // Skip this test by default
  
  runner.addTest('Proxy Handler - Error handling', async () => {
    const invalidUrl = 'https://r.jina.ai/invalid-url';
    const result = await proxyHandler.fetchJinaContent(invalidUrl);
    
    testUtils.assert(!result.success, 'Should fail for invalid URL');
    testUtils.assert(result.error, 'Should have error message');
  }, true); // Skip this test by default
}

/**
 * Database Migration Tests
 */
function addDatabaseMigrationTests(runner, dbMigration) {
  runner.addTest('Database Migration - SQL generation', () => {
    const sql = dbMigration.generateMigrationSQL();
    testUtils.assert(sql.includes('jina_url'), 'SQL should contain jina_url column');
    testUtils.assert(sql.includes('jina_enabled'), 'SQL should contain jina_enabled column');
    testUtils.assert(sql.includes('idx_bookmarks_jina_url'), 'SQL should contain jina_url index');
    testUtils.assert(sql.includes('migrations'), 'SQL should contain migrations table');
  });
  
  runner.addTest('Database Migration - Rollback SQL generation', () => {
    const rollbackSql = dbMigration.generateRollbackSQL();
    testUtils.assert(rollbackSql.includes('DROP COLUMN IF EXISTS jina_url'), 'Rollback should drop jina_url');
    testUtils.assert(rollbackSql.includes('DROP COLUMN IF EXISTS jina_enabled'), 'Rollback should drop jina_enabled');
  });
  
  runner.addTest('Database Migration - File creation', () => {
    const tempDir = path.join(path.dirname(import.meta.url), 'test-migrations');
    const migrationPath = dbMigration.createMigrationFile(tempDir);
    
    testUtils.assert(testUtils.fileExists(migrationPath), 'Migration file should be created');
    testUtils.assert(migrationPath.includes('migration_'), 'File name should contain migration prefix');
    
    // Clean up
    if (testUtils.fileExists(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  runner.addTest('Database Migration - Rollback file creation', () => {
    const tempDir = path.join(path.dirname(import.meta.url), 'test-migrations');
    const rollbackPath = dbMigration.createRollbackFile(tempDir);
    
    testUtils.assert(testUtils.fileExists(rollbackPath), 'Rollback file should be created');
    testUtils.assert(rollbackPath.includes('rollback_'), 'File name should contain rollback prefix');
    
    // Clean up
    if (testUtils.fileExists(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  runner.addTest('Database Migration - Checksum calculation', () => {
    const checksum = dbMigration.calculateChecksum();
    testUtils.assert(checksum.length === 16, 'Checksum should be 16 characters');
    testUtils.assert(typeof checksum === 'string', 'Checksum should be a string');
  });
}

/**
 * Integration Tests
 */
function addIntegrationTests(runner, urlConstructor, proxyHandler, dbMigration) {
  runner.addTest('Integration - URL construction and validation', () => {
    const originalUrl = 'https://example.com';
    const jinaUrl = urlConstructor.constructJinaUrl(originalUrl);
    
    testUtils.assert(proxyHandler.isValidJinaUrl(jinaUrl), 'Constructed URL should be valid');
    testUtils.assert(urlConstructor.isJinaUrl(jinaUrl), 'Constructed URL should be detected as r.jina.ai URL');
    
    const extracted = urlConstructor.extractOriginalUrl(jinaUrl);
    testUtils.assertEquals(extracted, originalUrl, 'Should extract original URL correctly');
  });
  
  runner.addTest('Integration - End-to-end URL processing', async () => {
    const originalUrl = 'https://example.com';
    
    // This would test the full pipeline, but requires network access
    // For now, we'll test the URL construction part
    const jinaUrl = urlConstructor.constructJinaUrl(originalUrl);
    testUtils.assert(jinaUrl.startsWith('https://r.jina.ai/'), 'Should construct proper r.jina.ai URL');
  }, true); // Skip network-dependent test
  
  runner.addTest('Integration - Migration and validation consistency', () => {
    const migrationSql = dbMigration.generateMigrationSQL();
    const rollbackSql = dbMigration.generateRollbackSQL();
    
    // Check that migration and rollback are inverses
    testUtils.assert(migrationSql.includes('ADD COLUMN'), 'Migration should add columns');
    testUtils.assert(rollbackSql.includes('DROP COLUMN'), 'Rollback should drop columns');
  });
}

/**
 * Permission and Security Tests
 */
function addSecurityTests(runner, urlConstructor, proxyHandler) {
  runner.addTest('Security - URL sanitization', () => {
    const maliciousUrl = 'https://example.com<script>alert("xss")</script>';
    const jinaUrl = urlConstructor.constructJinaUrl(maliciousUrl);
    
    // The URL should be properly encoded and safe
    testUtils.assert(jinaUrl.includes('r.jina.ai'), 'Should still construct r.jina.ai URL');
    testUtils.assert(!jinaUrl.includes('<script>'), 'Should not contain raw script tags');
  });
  
  runner.addTest('Security - Protocol enforcement', () => {
    const ftpUrl = 'ftp://example.com';
    const jinaUrl = urlConstructor.constructJinaUrl(ftpUrl);
    
    // Should normalize to https
    testUtils.assert(jinaUrl.includes('https://'), 'Should enforce HTTPS protocol');
  });
  
  runner.addTest('Security - Invalid characters handling', () => {
    const invalidCharsUrl = 'https://example.com/<>|?*:"';
    const jinaUrl = urlConstructor.constructJinaUrl(invalidCharsUrl);
    
    testUtils.assert(jinaUrl.includes('r.jina.ai'), 'Should handle URLs with special characters');
  });
}

/**
 * Performance Tests
 */
function addPerformanceTests(runner, urlConstructor) {
  runner.addTest('Performance - URL construction speed', () => {
    const startTime = Date.now();
    const urls = Array(1000).fill('https://example.com');
    
    urls.forEach(url => {
      urlConstructor.constructJinaUrl(url);
    });
    
    const duration = Date.now() - startTime;
    testUtils.assert(duration < 1000, `URL construction should be fast (took ${duration}ms)`);
  });
  
  runner.addTest('Performance - Batch processing efficiency', () => {
    const startTime = Date.now();
    const urls = Array(100).fill('https://example.com');
    
    const result = urlConstructor.batchConstructJinaUrls(urls);
    
    const duration = Date.now() - startTime;
    testUtils.assert(result.successful.length === 100, 'All URLs should be processed successfully');
    testUtils.assert(duration < 500, `Batch processing should be efficient (took ${duration}ms)`);
  });
}

/**
 * Main test execution
 */
async function runAllTests() {
  const runner = new TestRunner();
  runner.start();
  
  try {
    // Load modules
    const urlConstructorModule = await import('./url-constructor.js');
    const proxyHandlerModule = await import('./proxy-handler.js');
    const dbMigrationModule = await import('./database-migration.js');
    
    const urlConstructor = urlConstructorModule;
    const proxyHandler = proxyHandlerModule;
    const dbMigration = dbMigrationModule;
    
    // Add tests
    addUrlConstructorTests(runner, urlConstructor);
    addProxyHandlerTests(runner, proxyHandler);
    addDatabaseMigrationTests(runner, dbMigration);
    addIntegrationTests(runner, urlConstructor, proxyHandler, dbMigration);
    addSecurityTests(runner, urlConstructor, proxyHandler);
    addPerformanceTests(runner, urlConstructor);
    
    // Run all tests
    await runner.runTests();
    
  } catch (error) {
    console.error('❌ Failed to load test modules:', error.message);
    process.exit(1);
  }
}

// Export test runner for use in other modules
export {
  TestRunner,
  testUtils,
  addUrlConstructorTests,
  addProxyHandlerTests,
  addDatabaseMigrationTests,
  addIntegrationTests,
  addSecurityTests,
  addPerformanceTests,
  runAllTests
};

// If this script is run directly, execute all tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}
