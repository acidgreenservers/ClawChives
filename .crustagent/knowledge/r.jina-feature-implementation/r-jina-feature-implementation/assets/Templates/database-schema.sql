-- r.jina.ai Feature Database Schema
-- 
-- This SQL schema defines the database changes needed to support
-- the r.jina.ai proxy functionality in ClawChives.
--
-- Run this SQL against your existing ClawChives database to add
-- the necessary tables and columns for r.jina.ai support.

-- Add jina_url field to bookmarks table (if not already present)
ALTER TABLE bookmarks ADD COLUMN jina_url TEXT DEFAULT NULL;

-- Add jina_content field to bookmarks table for storing processed content
ALTER TABLE bookmarks ADD COLUMN jina_content TEXT DEFAULT NULL;

-- Add jina_processed_at field to track when content was last processed
ALTER TABLE bookmarks ADD COLUMN jina_processed_at TEXT DEFAULT NULL;

-- Add jina_status field to track processing status
ALTER TABLE bookmarks ADD COLUMN jina_status TEXT DEFAULT 'pending';

-- Create rjina_proxy_logs table for logging proxy requests
CREATE TABLE IF NOT EXISTS rjina_proxy_logs (
    id TEXT PRIMARY KEY,
    user_uuid TEXT NOT NULL,
    original_url TEXT NOT NULL,
    jina_url TEXT NOT NULL,
    status TEXT NOT NULL,
    response_time INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Create rjina_proxy_cache table for caching proxy responses
CREATE TABLE IF NOT EXISTS rjina_proxy_cache (
    id TEXT PRIMARY KEY,
    original_url TEXT NOT NULL UNIQUE,
    jina_url TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    response_time INTEGER,
    cached_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

-- Create rjina_proxy_config table for proxy configuration
CREATE TABLE IF NOT EXISTS rjina_proxy_config (
    id TEXT PRIMARY KEY,
    user_uuid TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_uuid, setting_key),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Create rjina_rate_limits table for tracking rate limit usage
CREATE TABLE IF NOT EXISTS rjina_rate_limits (
    id TEXT PRIMARY KEY,
    user_uuid TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    requests_count INTEGER DEFAULT 0,
    window_start TEXT NOT NULL,
    window_end TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_url ON bookmarks(jina_url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_status ON bookmarks(jina_status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_jina_processed_at ON bookmarks(jina_processed_at);

CREATE INDEX IF NOT EXISTS idx_rjina_proxy_logs_user_uuid ON rjina_proxy_logs(user_uuid);
CREATE INDEX IF NOT EXISTS idx_rjina_proxy_logs_original_url ON rjina_proxy_logs(original_url);
CREATE INDEX IF NOT EXISTS idx_rjina_proxy_logs_status ON rjina_proxy_logs(status);
CREATE INDEX IF NOT EXISTS idx_rjina_proxy_logs_created_at ON rjina_proxy_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_rjina_proxy_cache_original_url ON rjina_proxy_cache(original_url);
CREATE INDEX IF NOT EXISTS idx_rjina_proxy_cache_expires_at ON rjina_proxy_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_rjina_proxy_cache_content_hash ON rjina_proxy_cache(content_hash);

CREATE INDEX IF NOT EXISTS idx_rjina_proxy_config_user_uuid ON rjina_proxy_config(user_uuid);
CREATE INDEX IF NOT EXISTS idx_rjina_proxy_config_setting_key ON rjina_proxy_config(setting_key);

CREATE INDEX IF NOT EXISTS idx_rjina_rate_limits_user_uuid ON rjina_rate_limits(user_uuid);
CREATE INDEX IF NOT EXISTS idx_rjina_rate_limits_endpoint ON rjina_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rjina_rate_limits_window_end ON rjina_rate_limits(window_end);

-- Insert default proxy configuration for existing users
INSERT OR IGNORE INTO rjina_proxy_config (id, user_uuid, setting_key, setting_value, created_at, updated_at)
SELECT 
    hex(randomblob(16)),
    uuid,
    'proxy_enabled',
    'true',
    datetime('now'),
    datetime('now')
FROM users;

INSERT OR IGNORE INTO rjina_proxy_config (id, user_uuid, setting_key, setting_value, created_at, updated_at)
SELECT 
    hex(randomblob(16)),
    uuid,
    'cache_enabled',
    'true',
    datetime('now'),
    datetime('now')
FROM users;

INSERT OR IGNORE INTO rjina_proxy_config (id, user_uuid, setting_key, setting_value, created_at, updated_at)
SELECT 
    hex(randomblob(16)),
    uuid,
    'rate_limit',
    '100',
    datetime('now'),
    datetime('now')
FROM users;

-- Create views for easier querying

-- View for bookmarks with r.jina.ai processing status
CREATE VIEW IF NOT EXISTS v_bookmarks_with_jina AS
SELECT 
    b.*,
    CASE 
        WHEN b.jina_url IS NOT NULL AND b.jina_status = 'success' THEN 'processed'
        WHEN b.jina_url IS NOT NULL AND b.jina_status = 'pending' THEN 'processing'
        WHEN b.jina_url IS NOT NULL AND b.jina_status = 'error' THEN 'error'
        ELSE 'not_processed'
    END as jina_processing_status,
    CASE 
        WHEN b.jina_processed_at IS NOT NULL THEN 
            (strftime('%s', 'now') - strftime('%s', b.jina_processed_at))
        ELSE NULL
    END as jina_processed_seconds_ago
FROM bookmarks b;

-- View for proxy usage statistics
CREATE VIEW IF NOT EXISTS v_rjina_proxy_stats AS
SELECT 
    user_uuid,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests,
    AVG(response_time) as avg_response_time,
    MIN(created_at) as first_request,
    MAX(created_at) as last_request
FROM rjina_proxy_logs
GROUP BY user_uuid;

-- View for cached content statistics
CREATE VIEW IF NOT EXISTS v_rjina_cache_stats AS
SELECT 
    COUNT(*) as total_cached,
    COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as valid_cached,
    COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_cached,
    MIN(cached_at) as oldest_cache,
    MAX(cached_at) as newest_cache
FROM rjina_proxy_cache;

-- Triggers for automatic cleanup

-- Trigger to update updated_at timestamp on rjina_proxy_config updates
CREATE TRIGGER IF NOT EXISTS tr_rjina_proxy_config_updated_at
AFTER UPDATE ON rjina_proxy_config
FOR EACH ROW
BEGIN
    UPDATE rjina_proxy_config 
    SET updated_at = datetime('now') 
    WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on rjina_rate_limits updates
CREATE TRIGGER IF NOT EXISTS tr_rjina_rate_limits_updated_at
AFTER UPDATE ON rjina_rate_limits
FOR EACH ROW
BEGIN
    UPDATE rjina_rate_limits 
    SET updated_at = datetime('now') 
    WHERE id = NEW.id;
END;

-- Functions for common operations (SQLite doesn't support functions, so these are templates)

-- Template for updating bookmark with r.jina.ai processing result
-- UPDATE bookmarks 
-- SET jina_url = ?, jina_content = ?, jina_processed_at = ?, jina_status = ? 
-- WHERE id = ? AND user_uuid = ?;

-- Template for logging proxy request
-- INSERT INTO rjina_proxy_logs (id, user_uuid, original_url, jina_url, status, response_time, error_message, created_at)
-- VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- Template for checking rate limits
-- SELECT requests_count, window_end FROM rjina_rate_limits 
-- WHERE user_uuid = ? AND endpoint = ? AND window_end > datetime('now');

-- Template for updating rate limit counter
-- UPDATE rjina_rate_limits 
-- SET requests_count = requests_count + 1, updated_at = datetime('now') 
-- WHERE user_uuid = ? AND endpoint = ? AND window_end > datetime('now');

-- Template for cleaning up expired cache entries
-- DELETE FROM rjina_proxy_cache WHERE expires_at <= datetime('now');

-- Template for cleaning up old proxy logs (keep last 30 days)
-- DELETE FROM rjina_proxy_logs WHERE created_at < datetime('now', '-30 days');

-- Template for cleaning up old rate limit entries
-- DELETE FROM rjina_rate_limits WHERE window_end < datetime('now');

-- Sample queries for common operations

-- Get all bookmarks that need r.jina.ai processing
-- SELECT * FROM bookmarks WHERE jina_url IS NULL AND archived = 0;

-- Get all bookmarks with successful r.jina.ai processing
-- SELECT * FROM bookmarks WHERE jina_status = 'success' AND jina_content IS NOT NULL;

-- Get proxy usage for a specific user
-- SELECT * FROM rjina_proxy_logs WHERE user_uuid = ? ORDER BY created_at DESC LIMIT 100;

-- Get cache hit rate
-- SELECT 
--     (SELECT COUNT(*) FROM rjina_proxy_logs WHERE status = 'success') * 100.0 / 
--     (SELECT COUNT(*) FROM rjina_proxy_logs) as cache_hit_rate;

-- Get rate limit status for a user
-- SELECT * FROM rjina_rate_limits WHERE user_uuid = ? AND endpoint = '/api/proxy/r.jina' AND window_end > datetime('now');

-- Get proxy configuration for a user
-- SELECT setting_key, setting_value FROM rjina_proxy_config WHERE user_uuid = ?;

-- Get bookmarks with r.jina.ai content for export
-- SELECT id, url, title, jina_content as content, jina_processed_at as processed_at 
-- FROM bookmarks 
-- WHERE jina_status = 'success' AND jina_content IS NOT NULL 
-- ORDER BY jina_processed_at DESC;

-- Get error statistics for proxy requests
-- SELECT 
--     status,
--     COUNT(*) as count,
--     COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rjina_proxy_logs) as percentage
-- FROM rjina_proxy_logs 
-- GROUP BY status;

-- Get slowest proxy requests
-- SELECT * FROM rjina_proxy_logs 
-- WHERE response_time IS NOT NULL 
-- ORDER BY response_time DESC 
-- LIMIT 10;

-- Get most frequently accessed URLs
-- SELECT original_url, COUNT(*) as access_count 
-- FROM rjina_proxy_logs 
-- GROUP BY original_url 
-- ORDER BY access_count DESC 
-- LIMIT 10;

-- Get proxy performance by hour of day
-- SELECT 
--     strftime('%H', created_at) as hour,
--     COUNT(*) as request_count,
--     AVG(response_time) as avg_response_time
-- FROM rjina_proxy_logs 
-- WHERE response_time IS NOT NULL
-- GROUP BY strftime('%H', created_at) 
-- ORDER BY hour;

-- Get proxy performance by day of week
-- SELECT 
--     strftime('%w', created_at) as day_of_week,
--     COUNT(*) as request_count,
--     AVG(response_time) as avg_response_time
-- FROM rjina_proxy_logs 
-- WHERE response_time IS NOT NULL
-- GROUP BY strftime('%w', created_at) 
-- ORDER BY day_of_week;

-- Get proxy errors by error message
-- SELECT 
--     error_message,
--     COUNT(*) as error_count,
--     COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rjina_proxy_logs WHERE status = 'error') as percentage
-- FROM rjina_proxy_logs 
-- WHERE status = 'error' AND error_message IS NOT NULL
-- GROUP BY error_message 
-- ORDER BY error_count DESC;

-- Get cache statistics
-- SELECT 
--     'Total cached' as metric,
--     COUNT(*) as value
-- FROM rjina_proxy_cache
-- UNION ALL
-- SELECT 
--     'Valid cached' as metric,
--     COUNT(*) as value
-- FROM rjina_proxy_cache 
-- WHERE expires_at > datetime('now')
-- UNION ALL
-- SELECT 
--     'Expired cached' as metric,
--     COUNT(*) as value
-- FROM rjina_proxy_cache 
-- WHERE expires_at <= datetime('now')
-- UNION ALL
-- SELECT 
--     'Average cache age (hours)' as metric,
--     AVG((strftime('%s', 'now') - strftime('%s', cached_at)) / 3600.0) as value
-- FROM rjina_proxy_cache;

-- Get bookmarks with cached content
-- SELECT b.*, c.content as cached_content, c.cached_at
-- FROM bookmarks b
-- JOIN rjina_proxy_cache c ON b.jina_url = c.jina_url
-- WHERE c.expires_at > datetime('now')
-- ORDER BY c.cached_at DESC;

-- Get proxy configuration defaults
-- SELECT 
--     'proxy_enabled' as setting,
--     'true' as default_value,
--     'Enable r.jina.ai proxy functionality' as description
-- UNION ALL
-- SELECT 
--     'cache_enabled' as setting,
--     'true' as default_value,
--     'Enable caching of proxy responses' as description
-- UNION ALL
-- SELECT 
--     'rate_limit' as setting,
--     '100' as default_value,
--     'Rate limit for proxy requests per 15 minutes' as description
-- UNION ALL
-- SELECT 
--     'cache_ttl' as setting,
--     '3600' as default_value,
--     'Cache TTL in seconds (default 1 hour)' as description
-- UNION ALL
-- SELECT 
--     'timeout' as setting,
--     '30000' as default_value,
--     'Request timeout in milliseconds (default 30 seconds)' as description;

-- Get migration status
-- SELECT 
--     'bookmarks_jina_url' as feature,
--     CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name = 'jina_url') > 0 THEN 'installed' ELSE 'pending' END as status
-- UNION ALL
-- SELECT 
--     'bookmarks_jina_content' as feature,
--     CASE WHEN (SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name = 'jina_content') > 0 THEN 'installed' ELSE 'pending' END as status
-- UNION ALL
-- SELECT 
--     'rjina_proxy_logs' as feature,
--     CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'rjina_proxy_logs') > 0 THEN 'installed' ELSE 'pending' END as status
-- UNION ALL
-- SELECT 
--     'rjina_proxy_cache' as feature,
--     CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'rjina_proxy_cache') > 0 THEN 'installed' ELSE 'pending' END as status
-- UNION ALL
-- SELECT 
--     'rjina_proxy_config' as feature,
--     CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'rjina_proxy_config') > 0 THEN 'installed' ELSE 'pending' END as status
-- UNION ALL
-- SELECT 
--     'rjina_rate_limits' as feature,
--     CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'rjina_rate_limits') > 0 THEN 'installed' ELSE 'pending' END as status;

-- End of r.jina.ai database schema
