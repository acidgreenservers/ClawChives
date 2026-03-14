/**
 * Database Migration for r.jina.ai Feature
 * 
 * This script handles database schema updates for the r.jina.ai feature in ClawChives.
 * It adds the jina_url column to the bookmarks table, creates necessary indexes,
 * and handles migration versioning to ensure compatibility with the existing
 * ClawChives database structure.
 * 
 * @author ClawChives Development Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Migration configuration
const MIGRATION_VERSION = '2024_01_r_jina_ai_integration';
const MIGRATION_FILE = `migration_${MIGRATION_VERSION}.sql`;

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
 * Generates the SQL migration script for r.jina.ai feature
 * @returns {string} - The complete SQL migration script
 */
function generateMigrationSQL() {
  return `
-- Migration: ${MIGRATION_VERSION}
-- Description: Add r.jina.ai support to bookmarks table
-- Created: ${new Date().toISOString()}

-- Backup existing data (optional safety measure)
CREATE TABLE IF NOT EXISTS bookmarks_backup AS 
SELECT id, url, title, description, tags, created_at, updated_at 
FROM bookmarks 
WHERE 1=0;

-- Add jina_url column to bookmarks table
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS jina_url TEXT;

-- Add jina_enabled column to bookmarks table (to control feature usage)
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS jina_enabled BOOLEAN DEFAULT 0;

-- Create index on jina_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_url ON bookmarks(jina_url);

-- Create index on jina_enabled for filtering enabled bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_enabled ON bookmarks(jina_enabled);

-- Update existing bookmarks to have jina_enabled = 0 (disabled by default)
UPDATE bookmarks SET jina_enabled = 0 WHERE jina_enabled IS NULL;

-- Add migration tracking (if not exists)
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    description TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT
);

-- Record this migration
INSERT OR IGNORE INTO migrations (version, description, checksum) VALUES (
    '${MIGRATION_VERSION}',
    'Add r.jina.ai support to bookmarks table',
    '${calculateChecksum()}'
);

-- Verify migration
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name = 'jina_url') as jina_url_column_exists,
    (SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name = 'jina_enabled') as jina_enabled_column_exists,
    (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_bookmarks_jina_url') as jina_url_index_exists,
    (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_bookmarks_jina_enabled') as jina_enabled_index_exists;
`;
}

/**
 * Calculates a simple checksum for the migration
 * @returns {string} - SHA-256 like checksum (simplified)
 */
function calculateChecksum() {
  // Generate SQL without checksum first to avoid circular dependency
  const sqlWithoutChecksum = `
-- Migration: ${MIGRATION_VERSION}
-- Description: Add r.jina.ai support to bookmarks table
-- Created: ${new Date().toISOString()}

-- Backup existing data (optional safety measure)
CREATE TABLE IF NOT EXISTS bookmarks_backup AS 
SELECT id, url, title, description, tags, created_at, updated_at 
FROM bookmarks 
WHERE 1=0;

-- Add jina_url column to bookmarks table
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS jina_url TEXT;

-- Add jina_enabled column to bookmarks table (to control feature usage)
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS jina_enabled BOOLEAN DEFAULT 0;

-- Create index on jina_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_url ON bookmarks(jina_url);

-- Create index on jina_enabled for filtering enabled bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_enabled ON bookmarks(jina_enabled);

-- Update existing bookmarks to have jina_enabled = 0 (disabled by default)
UPDATE bookmarks SET jina_enabled = 0 WHERE jina_enabled IS NULL;

-- Add migration tracking (if not exists)
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    description TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT
);

-- Record this migration
INSERT OR IGNORE INTO migrations (version, description, checksum) VALUES (
    '${MIGRATION_VERSION}',
    'Add r.jina.ai support to bookmarks table',
    'CHECKSUM_PLACEHOLDER'
);

-- Verify migration
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name = 'jina_url') as jina_url_column_exists,
    (SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name = 'jina_enabled') as jina_enabled_column_exists,
    (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_bookmarks_jina_url') as jina_url_index_exists,
    (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_bookmarks_jina_enabled') as jina_enabled_index_exists;
`;
  
  return crypto.createHash('sha256').update(sqlWithoutChecksum).digest('hex').substring(0, 16);
}

/**
 * Creates the migration SQL file
 * @param {string} outputDir - Directory to save the migration file
 * @returns {string} - Path to the created migration file
 */
function createMigrationFile(outputDir = './migrations') {
  try {
    // Ensure migrations directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      logger.info(`Created migrations directory: ${outputDir}`);
    }
    
    const migrationPath = path.join(outputDir, MIGRATION_FILE);
    const sqlContent = generateMigrationSQL();
    
    fs.writeFileSync(migrationPath, sqlContent, 'utf8');
    
    logger.info('Migration file created successfully', {
      path: migrationPath,
      version: MIGRATION_VERSION,
      checksum: calculateChecksum()
    });
    
    return migrationPath;
  } catch (error) {
    logger.error('Failed to create migration file', error);
    throw error;
  }
}

/**
 * Validates the current database schema
 * @param {Object} db - Database connection object (SQLite3)
 * @returns {Promise<Object>} - Validation results
 */
async function validateSchema(db) {
  try {
    const results = {
      hasJinaUrlColumn: false,
      hasJinaEnabledColumn: false,
      hasJinaUrlIndex: false,
      hasJinaEnabledIndex: false,
      isMigrationRecorded: false,
      errors: []
    };
    
    // Check if jina_url column exists
    try {
      const jinaUrlResult = await db.get(
        "SELECT COUNT(*) as count FROM pragma_table_info('bookmarks') WHERE name = 'jina_url'"
      );
      results.hasJinaUrlColumn = jinaUrlResult.count > 0;
    } catch (error) {
      results.errors.push(`Failed to check jina_url column: ${error.message}`);
    }
    
    // Check if jina_enabled column exists
    try {
      const jinaEnabledResult = await db.get(
        "SELECT COUNT(*) as count FROM pragma_table_info('bookmarks') WHERE name = 'jina_enabled'"
      );
      results.hasJinaEnabledColumn = jinaEnabledResult.count > 0;
    } catch (error) {
      results.errors.push(`Failed to check jina_enabled column: ${error.message}`);
    }
    
    // Check if jina_url index exists
    try {
      const jinaUrlIndexResult = await db.get(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'index' AND name = 'idx_bookmarks_jina_url'"
      );
      results.hasJinaUrlIndex = jinaUrlIndexResult.count > 0;
    } catch (error) {
      results.errors.push(`Failed to check jina_url index: ${error.message}`);
    }
    
    // Check if jina_enabled index exists
    try {
      const jinaEnabledIndexResult = await db.get(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'index' AND name = 'idx_bookmarks_jina_enabled'"
      );
      results.hasJinaEnabledIndex = jinaEnabledIndexResult.count > 0;
    } catch (error) {
      results.errors.push(`Failed to check jina_enabled index: ${error.message}`);
    }
    
    // Check if migration is recorded
    try {
      const migrationResult = await db.get(
        "SELECT COUNT(*) as count FROM migrations WHERE version = ?",
        [MIGRATION_VERSION]
      );
      results.isMigrationRecorded = migrationResult.count > 0;
    } catch (error) {
      results.errors.push(`Failed to check migration record: ${error.message}`);
    }
    
    return results;
  } catch (error) {
    logger.error('Schema validation failed', error);
    throw error;
  }
}

/**
 * Applies the migration to the database
 * @param {Object} db - Database connection object (SQLite3)
 * @returns {Promise<Object>} - Migration results
 */
async function applyMigration(db) {
  try {
    const validation = await validateSchema(db);
    
    // Check if migration is already applied
    if (validation.isMigrationRecorded) {
      logger.info('Migration already applied, skipping...');
      return {
        success: true,
        alreadyApplied: true,
        validation: validation
      };
    }
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Execute the migration SQL
      const migrationSQL = generateMigrationSQL();
      await db.exec(migrationSQL);
      
      // Commit transaction
      await db.run('COMMIT');
      
      logger.info('Migration applied successfully');
      
      return {
        success: true,
        alreadyApplied: false,
        validation: await validateSchema(db)
      };
      
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  }
}

/**
 * Generates a rollback script for the migration
 * @returns {string} - SQL rollback script
 */
function generateRollbackSQL() {
  return `
-- Rollback for migration: ${MIGRATION_VERSION}
-- WARNING: This will remove r.jina.ai support from bookmarks table

-- Remove indexes
DROP INDEX IF EXISTS idx_bookmarks_jina_url;
DROP INDEX IF EXISTS idx_bookmarks_jina_enabled;

-- Remove columns
ALTER TABLE bookmarks DROP COLUMN IF EXISTS jina_url;
ALTER TABLE bookmarks DROP COLUMN IF EXISTS jina_enabled;

-- Remove migration record
DELETE FROM migrations WHERE version = '${MIGRATION_VERSION}';

-- Note: This rollback does not restore any data that may have been modified
-- during the migration. Always backup your database before running migrations.
`;
}

/**
 * Creates a rollback SQL file
 * @param {string} outputDir - Directory to save the rollback file
 * @returns {string} - Path to the created rollback file
 */
function createRollbackFile(outputDir = './migrations') {
  try {
    const rollbackFile = `rollback_${MIGRATION_VERSION}.sql`;
    const rollbackPath = path.join(outputDir, rollbackFile);
    const rollbackSQL = generateRollbackSQL();
    
    fs.writeFileSync(rollbackPath, rollbackSQL, 'utf8');
    
    logger.info('Rollback file created successfully', {
      path: rollbackPath,
      version: MIGRATION_VERSION
    });
    
    return rollbackPath;
  } catch (error) {
    logger.error('Failed to create rollback file', error);
    throw error;
  }
}

/**
 * Checks if the database is ready for the migration
 * @param {Object} db - Database connection object
 * @returns {Promise<boolean>} - True if ready, false otherwise
 */
async function isDatabaseReady(db) {
  try {
    // Check if bookmarks table exists
    const tableCheck = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'"
    );
    
    if (!tableCheck) {
      logger.error('Bookmarks table not found. Database may not be initialized.');
      return false;
    }
    
    // Check if migrations table exists, create if not
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        description TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT
      )
    `);
    
    return true;
  } catch (error) {
    logger.error('Database readiness check failed', error);
    return false;
  }
}

// Export functions for use in other modules
export {
  generateMigrationSQL,
  createMigrationFile,
  validateSchema,
  applyMigration,
  generateRollbackSQL,
  createRollbackFile,
  isDatabaseReady,
  MIGRATION_VERSION,
  logger
};

// If this script is run directly, provide a simple CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node database-migration.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  create-file     Create migration SQL file');
    console.log('  create-rollback Create rollback SQL file');
    console.log('  validate        Validate current schema (requires --db-path)');
    console.log('  apply           Apply migration (requires --db-path)');
    console.log('');
    console.log('Options:');
    console.log('  --db-path <path>  Path to SQLite database file');
    console.log('  --output-dir <dir>  Output directory for SQL files (default: ./migrations)');
    process.exit(1);
  }
  
  const command = args[0];
  const dbPathIndex = args.indexOf('--db-path');
  const outputPathIndex = args.indexOf('--output-dir');
  
  const dbPath = dbPathIndex !== -1 ? args[dbPathIndex + 1] : null;
  const outputPath = outputPathIndex !== -1 ? args[outputPathIndex + 1] : './migrations';
  
  (async () => {
    try {
      switch (command) {
        case 'create-file':
          createMigrationFile(outputPath);
          console.log('✅ Migration file created successfully!');
          break;
          
        case 'create-rollback':
          createRollbackFile(outputPath);
          console.log('✅ Rollback file created successfully!');
          break;
          
        case 'validate':
          if (!dbPath) {
            console.log('❌ --db-path is required for validate command');
            process.exit(1);
          }
          
          const sqlite3 = await import('sqlite3');
          const db = new sqlite3.Database(dbPath);
          
          const validation = await validateSchema(db);
          console.log('Schema validation results:');
          console.log(JSON.stringify(validation, null, 2));
          
          db.close();
          break;
          
        case 'apply':
          if (!dbPath) {
            console.log('❌ --db-path is required for apply command');
            process.exit(1);
          }
          
          const sqlite3Apply = await import('sqlite3');
          const dbApply = new sqlite3Apply.Database(dbPath);
          
          const ready = await isDatabaseReady(dbApply);
          if (!ready) {
            console.log('❌ Database is not ready for migration');
            dbApply.close();
            process.exit(1);
          }
          
          const result = await applyMigration(dbApply);
          console.log('Migration result:');
          console.log(JSON.stringify(result, null, 2));
          
          dbApply.close();
          break;
          
        default:
          console.log(`❌ Unknown command: ${command}`);
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  })();
}
