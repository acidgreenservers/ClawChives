# r.jina.ai Feature Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the r.jina.ai feature to different environments in the ClawChives bookmark manager.

## Prerequisites

### System Requirements
- Node.js 18+ 
- Express server with SQLite support
- CORS configuration capability
- Rate limiting middleware support
- Audit logging system

### Dependencies
- `express-rate-limit` for rate limiting
- `cors` for CORS configuration
- `better-sqlite3` for database operations
- Existing ClawChives authentication system

### Environment Setup
- Database access permissions
- API server configuration access
- Frontend build system access
- Monitoring and logging setup

## Pre-Deployment Checklist

### Development Environment
- [ ] Feature implementation complete
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security review completed
- [ ] Code review approved

### Staging Environment
- [ ] Database migration tested
- [ ] API endpoints tested
- [ ] Frontend integration tested
- [ ] Performance benchmarks met
- [ ] Security tests passed

### Production Environment
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Backup procedures updated
- [ ] Rollback procedures documented
- [ ] Team training completed

## Database Migration

### Migration Script
```sql
-- Run this script against your existing ClawChives database

-- Add fields to bookmarks table
ALTER TABLE bookmarks ADD COLUMN jina_url TEXT DEFAULT NULL;
ALTER TABLE bookmarks ADD COLUMN jina_content TEXT DEFAULT NULL;
ALTER TABLE bookmarks ADD COLUMN jina_processed_at TEXT DEFAULT NULL;
ALTER TABLE bookmarks ADD COLUMN jina_status TEXT DEFAULT 'pending';

-- Create new tables
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

-- Create indexes
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
```

### Migration Steps
1. **Backup Database**
   ```bash
   # Create backup before migration
   sqlite3 /path/to/db.sqlite ".backup backup_before_rjina.sqlite"
   ```

2. **Apply Migration**
   ```bash
   # Run migration script
   sqlite3 /path/to/db.sqlite < rjina_migration.sql
   ```

3. **Verify Migration**
   ```sql
   -- Check if new fields exist
   PRAGMA table_info(bookmarks);
   
   -- Check if new tables exist
   SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rjina_%';
   ```

4. **Test Migration**
   ```bash
   # Run database tests
   npm test -- --testNamePattern="database"
   ```

## Backend Deployment

### 1. API Server Configuration

#### Environment Variables
```bash
# Add to your environment configuration
RJINA_PROXY_ENABLED=true
RJINA_CACHE_ENABLED=true
RJINA_RATE_LIMIT=100
RJINA_CACHE_TTL=3600
RJINA_REQUEST_TIMEOUT=30000
```

#### CORS Configuration
```javascript
// Add to your server configuration
import { rJinaProxyCorsConfig, rJinaStatusCorsConfig } from './config/corsConfig.js';

// Apply CORS to r.jina routes
app.use('/api/proxy/r.jina', cors(rJinaProxyCorsConfig));
app.use('/api/proxy/r.jina/status', cors(rJinaStatusCorsConfig));
```

#### Rate Limiting Configuration
```javascript
// Add to your middleware setup
import { rJinaProxyRateLimit, rJinaStatusRateLimit } from './middleware/rateLimiter.js';

// Apply rate limiting
app.use('/api/proxy/r.jina', rJinaProxyRateLimit);
app.use('/api/proxy/r.jina/status', rJinaStatusRateLimit);
```

### 2. Route Registration
```javascript
// Add to your route configuration
import rJinaRoutes from './routes/rjina.js';

// Register r.jina routes
app.use('/', rJinaRoutes);
```

### 3. Middleware Setup
```javascript
// Add to your middleware stack
import { requireHuman } from './middleware/permissionChecker.js';
import { rJinaAuditMiddleware } from './middleware/rjina.js';

// Apply middleware to r.jina routes
app.use('/api/proxy/r.jina', [
  requireAuth,
  requireHuman,
  rJinaAuditMiddleware()
]);
```

## Frontend Deployment

### 1. Build Configuration
```javascript
// Add to your vite.config.js or webpack config
export default {
  // ... existing config
  define: {
    __RJINA_ENABLED__: JSON.stringify(process.env.RJINA_ENABLED || 'true'),
    __RJINA_API_BASE__: JSON.stringify(process.env.RJINA_API_BASE || '/api/proxy/r.jina')
  }
};
```

### 2. Component Integration
```javascript
// Add to your main application
import { BookmarkModal } from './components/dashboard/BookmarkModal.js';
import { ProxyStatusIndicator } from './components/ui/ProxyStatusIndicator.js';

// Integrate components
function App() {
  return (
    <div>
      <ProxyStatusIndicator />
      <BookmarkModal />
    </div>
  );
}
```

### 3. API Client Setup
```javascript
// Add to your API client
export const rjinaApi = {
  async getStatus() {
    const response = await fetch('/api/proxy/r.jina/status');
    return response.json();
  },
  
  async processUrl(url, options = {}) {
    const response = await fetch('/api/proxy/r.jina', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ url, options })
    });
    return response.json();
  }
};
```

## Environment-Specific Configuration

### Development Environment
```javascript
// config/development.js
export const config = {
  rjina: {
    enabled: true,
    proxyEnabled: true,
    cacheEnabled: true,
    rateLimit: 200, // Higher limits for development
    cacheTtl: 300, // 5 minutes for faster development
    cors: {
      origin: '*', // Allow all origins in development
      credentials: false
    }
  }
};
```

### Staging Environment
```javascript
// config/staging.js
export const config = {
  rjina: {
    enabled: true,
    proxyEnabled: true,
    cacheEnabled: true,
    rateLimit: 150, // Moderate limits
    cacheTtl: 1800, // 30 minutes
    cors: {
      origin: ['https://staging.yourdomain.com'],
      credentials: true
    }
  }
};
```

### Production Environment
```javascript
// config/production.js
export const config = {
  rjina: {
    enabled: true,
    proxyEnabled: true,
    cacheEnabled: true,
    rateLimit: 100, // Standard limits
    cacheTtl: 3600, // 1 hour
    cors: {
      origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
      credentials: true
    }
  }
};
```

## Monitoring and Observability

### Metrics to Monitor
```javascript
// Add to your monitoring setup
const metrics = {
  rjina: {
    proxyRequests: 'counter',
    proxyErrors: 'counter', 
    proxyResponseTime: 'histogram',
    cacheHitRate: 'gauge',
    rateLimitViolations: 'counter',
    activeUsers: 'gauge'
  }
};
```

### Health Checks
```javascript
// Add to your health check endpoint
app.get('/health/rjina', async (req, res) => {
  try {
    const status = await checkRjinaHealth();
    res.json({
      status: status.online ? 'healthy' : 'unhealthy',
      responseTime: status.responseTime,
      cacheHitRate: status.cacheHitRate,
      activeUsers: status.activeUsers
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Alerting Rules
```yaml
# Add to your alerting configuration
alerts:
  - name: rjina_proxy_high_error_rate
    condition: rjina_proxy_errors > 10
    duration: 5m
    message: "High error rate on r.jina proxy"
    
  - name: rjina_proxy_slow_response
    condition: rjina_proxy_response_time > 5000
    duration: 2m
    message: "Slow response time on r.jina proxy"
    
  - name: rjina_cache_low_hit_rate
    condition: rjina_cache_hit_rate < 0.5
    duration: 10m
    message: "Low cache hit rate on r.jina proxy"
```

## Rollback Procedures

### Database Rollback
```sql
-- Rollback script
-- Note: This will delete all r.jina data

-- Drop new tables
DROP TABLE IF EXISTS rjina_proxy_logs;
DROP TABLE IF EXISTS rjina_proxy_cache;
DROP TABLE IF EXISTS rjina_proxy_config;
DROP TABLE IF EXISTS rjina_rate_limits;

-- Remove new columns from bookmarks
-- Note: SQLite doesn't support DROP COLUMN, so this requires table recreation
-- Use a backup to restore the original schema if needed
```

### Code Rollback
```bash
# Git-based rollback
git checkout main
git pull origin main
git tag rollback-before-rjina
git push origin rollback-before-rjina

# Deploy previous version
npm run build
npm run start
```

### Configuration Rollback
```bash
# Disable r.jina feature
export RJINA_PROXY_ENABLED=false
export RJINA_CACHE_ENABLED=false

# Restart services
systemctl restart clawchives-api
systemctl restart clawchives-frontend
```

## Post-Deployment Verification

### Automated Tests
```bash
# Run deployment verification tests
npm run test:deployment

# Test API endpoints
curl -X GET /api/proxy/r.jina/status
curl -X POST /api/proxy/r.jina -d '{"url": "https://example.com"}'

# Test frontend integration
npm run test:e2e -- --grep "r.jina"
```

### Manual Verification
1. **API Functionality**
   - [ ] Status endpoint returns correct information
   - [ ] Proxy endpoint processes URLs correctly
   - [ ] Rate limiting works as expected
   - [ ] Error handling is proper

2. **Frontend Integration**
   - [ ] r.jina checkbox appears in bookmark modal
   - [ ] Status indicator shows correct state
   - [ ] Content preview works
   - [ ] Error messages are displayed

3. **Database Operations**
   - [ ] New tables are created
   - [ ] Data is stored correctly
   - [ ] Indexes are working
   - [ ] Cleanup processes work

4. **Monitoring**
   - [ ] Metrics are being collected
   - [ ] Alerts are configured
   - [ ] Logs are being written
   - [ ] Dashboard shows correct data

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database permissions
ls -la /path/to/db.sqlite
chmod 644 /path/to/db.sqlite

# Check database integrity
sqlite3 /path/to/db.sqlite "PRAGMA integrity_check;"
```

#### CORS Errors
```javascript
// Check CORS configuration
console.log('CORS config:', corsConfig);

// Test CORS manually
fetch('/api/proxy/r.jina/status', {
  method: 'GET',
  headers: {
    'Origin': 'https://yourdomain.com'
  }
});
```

#### Rate Limiting Issues
```bash
# Check rate limit configuration
curl -I /api/proxy/r.jina/status

# Check rate limit headers
# Look for: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

#### Cache Issues
```bash
# Clear cache manually
DELETE FROM rjina_proxy_cache WHERE expires_at <= datetime('now');

# Check cache statistics
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as valid
FROM rjina_proxy_cache;
```

### Debug Commands
```bash
# Check API logs
tail -f /var/log/clawchives/api.log | grep rjina

# Check database queries
sqlite3 /path/to/db.sqlite "SELECT * FROM rjina_proxy_logs ORDER BY created_at DESC LIMIT 10;"

# Check frontend console
# Open browser dev tools and look for rjina-related logs

# Test connectivity
curl -v https://r.jina.ai/http://example.com
```

## Performance Optimization

### Database Optimization
```sql
-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM rjina_proxy_logs WHERE user_uuid = ?;

-- Update statistics
ANALYZE;
```

### Cache Optimization
```javascript
// Optimize cache settings
const cacheConfig = {
  ttl: 3600, // 1 hour
  maxSize: 1000, // Maximum cache entries
  compression: true // Enable compression for large content
};
```

### Rate Limiting Optimization
```javascript
// Optimize rate limiting
const rateLimitConfig = {
  windowMs: 900000, // 15 minutes
  max: 100, // Requests per window
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true, // Return rate limit info
  legacyHeaders: false // Disable legacy headers
};
```

## Security Considerations

### Security Checklist
- [ ] All endpoints require authentication
- [ ] Human-only access is enforced
- [ ] Input validation is comprehensive
- [ ] Rate limiting prevents abuse
- [ ] Audit logging is enabled
- [ ] Sensitive data is not logged
- [ ] CORS is properly configured
- [ ] Database queries are parameterized

### Security Monitoring
```javascript
// Monitor security events
const securityEvents = [
  'HUMAN_ONLY_ACCESS_DENIED',
  'RJINA_RATE_LIMIT_EXCEEDED',
  'RJINA_VALIDATION_FAILED',
  'RJINA_PROXY_REQUEST'
];

// Set up alerts for security events
monitor.on('security_event', (event) => {
  if (securityEvents.includes(event.type)) {
    alertManager.sendAlert(event);
  }
});
```

## Support and Maintenance

### Regular Maintenance
- [ ] Monitor cache hit rates weekly
- [ ] Review rate limit violations monthly
- [ ] Clean up old logs quarterly
- [ ] Update r.jina.ai API endpoints as needed
- [ ] Review and update security configurations

### Support Contacts
- **Development Team**: dev@yourdomain.com
- **Operations Team**: ops@yourdomain.com
- **Security Team**: security@yourdomain.com
- **On-call**: +1-XXX-XXX-XXXX

### Documentation Updates
- Update API documentation when endpoints change
- Update user guides when features are added
- Update troubleshooting guides when new issues are discovered
- Review and update security documentation annually

---

**Note**: This deployment guide should be customized based on your specific environment and requirements. Always test deployment procedures in a staging environment before applying to production.
