# Troubleshooting Guide for r.jina.ai Implementation

## Overview

This guide provides comprehensive troubleshooting information for common issues encountered during the implementation and operation of the r.jina.ai feature in ClawChives bookmark manager. It covers implementation problems, debugging techniques, database issues, permission problems, and performance optimization.

## Common Implementation Problems

### 1. Frontend Issues

#### 1.1 r.jina Conversion Checkbox Not Appearing

**Problem:** The r.jina conversion checkbox is not visible in the BookmarkModal.

**Possible Causes:**
- Component state not properly initialized
- CSS styles hiding the checkbox
- Feature flag preventing display

**Solutions:**

1. **Check Component State:**
```typescript
// Ensure state is properly initialized
const [state, setState] = useState({
  convertToJina: false, // Should be false by default
  // ... other state
});
```

2. **Verify CSS Styles:**
```css
/* Check for conflicting styles */
.jina-conversion-toggle {
  display: block !important; /* Remove any display: none */
  visibility: visible;      /* Ensure visibility */
}
```

3. **Check Feature Flag:**
```typescript
// Ensure feature flag is enabled
{FEATURE_FLAGS.rJinaConversion && (
  <div className="jina-conversion-toggle">
    {/* Checkbox component */}
  </div>
)}
```

#### 1.2 Conversion Status Not Updating

**Problem:** The loading indicator or conversion status doesn't update properly.

**Debugging Steps:**

1. **Check State Updates:**
```typescript
// Add console logs to track state changes
useEffect(() => {
  console.log('Conversion status changed:', state.isConverting);
}, [state.isConverting]);
```

2. **Verify Async Operations:**
```typescript
// Ensure async operations complete properly
const handleSubmit = async (e: React.FormEvent) => {
  setState(prev => ({ ...prev, isConverting: true }));
  
  try {
    // API call
    const result = await api.createBookmark(data);
    console.log('API call successful:', result);
  } catch (error) {
    console.error('API call failed:', error);
  } finally {
    setState(prev => ({ ...prev, isConverting: false }));
  }
};
```

#### 1.3 Form Submission Failing

**Problem:** Bookmark creation fails when r.jina conversion is enabled.

**Common Causes:**
- API endpoint not properly configured
- CORS issues
- Authentication problems

**Solutions:**

1. **Check API Endpoint:**
```typescript
// Verify API endpoint is correct
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000';
const response = await fetch(`${API_BASE}/api/bookmarks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

2. **Debug CORS Issues:**
```typescript
// Check browser console for CORS errors
// Add CORS headers to backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### 2. Backend Issues

#### 2.1 r.jina Proxy Endpoint Not Responding

**Problem:** The `/api/bookmarks/r.jina` endpoint returns errors or timeouts.

**Debugging Steps:**

1. **Check Route Registration:**
```typescript
// Verify route is properly registered
app.post('/api/bookmarks/r.jina', 
  humanAccessControl,
  validateJinaRequest,
  async (req, res) => {
    try {
      const { url } = req.body;
      const content = await JinaProxyService.fetchContent(url);
      res.json({ success: true, data: { content } });
    } catch (error) {
      console.error('r.jina proxy error:', error);
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  }
);
```

2. **Test External Fetch:**
```typescript
// Test r.jina.ai URL directly
const testUrl = 'https://r.jina.ai/http://example.com';
const response = await fetch(testUrl);
console.log('Direct fetch response:', response.status, response.statusText);
```

#### 2.2 Authentication Middleware Blocking Requests

**Problem:** Valid requests are being blocked by authentication middleware.

**Solutions:**

1. **Check Token Validation:**
```typescript
// Add debug logging to middleware
export const validateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Token received:', token ? 'present' : 'missing');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token validation error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

2. **Verify Session Management:**
```typescript
// Check session validation
export const validateSession = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  console.log('Session ID:', sessionId);
  
  if (!sessionId) {
    return res.status(401).json({ error: 'No session found' });
  }
  
  const session = await SessionService.getSession(sessionId);
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Session expired' });
  }
  
  req.user = session.user;
  next();
};
```

#### 2.3 Database Migration Issues

**Problem:** Database migrations for r.jina fields fail or don't apply correctly.

**Solutions:**

1. **Check Migration File:**
```sql
-- Verify migration SQL is correct
ALTER TABLE bookmarks ADD COLUMN converted_to_jina BOOLEAN DEFAULT FALSE;
ALTER TABLE bookmarks ADD COLUMN jina_url TEXT;
```

2. **Run Migration Manually:**
```bash
# Check migration status
npm run db:migrate:status

# Run specific migration
npm run db:migrate -- --name add_jina_support

# Rollback if needed
npm run db:migrate:rollback
```

3. **Verify Database Schema:**
```sql
-- Check if columns exist
DESCRIBE bookmarks;

-- Verify column types
SHOW COLUMNS FROM bookmarks WHERE Field IN ('converted_to_jina', 'jina_url');
```

## Debugging Techniques

### 1. Frontend Debugging

#### 1.1 Browser Developer Tools

**Network Tab:**
- Monitor API requests to `/api/bookmarks/r.jina`
- Check request headers, body, and response
- Verify CORS headers and status codes

**Console Tab:**
- Look for JavaScript errors
- Check console logs from debug statements
- Monitor state changes

**Application Tab:**
- Inspect localStorage and sessionStorage
- Check cookies for session information
- Verify environment variables

#### 1.2 React Developer Tools

**Component Inspection:**
- Check component props and state
- Monitor state updates and re-renders
- Verify event handlers are attached

**Performance Profiling:**
- Identify performance bottlenecks
- Check for unnecessary re-renders
- Monitor memory usage

#### 1.3 Debugging Code Examples

```typescript
// Add comprehensive logging
const debugJinaConversion = (data: any) => {
  console.group('Jina Conversion Debug');
  console.log('Input data:', data);
  console.log('State before:', state);
  console.log('User agent:', navigator.userAgent);
  console.log('Feature flags:', FEATURE_FLAGS);
  console.groupEnd();
};

// Use React DevTools profiler
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log(`Component ${id} rendered in ${actualDuration}ms`);
};

<Profiler id="BookmarkModal" onRender={onRenderCallback}>
  <BookmarkModal />
</Profiler>
```

### 2. Backend Debugging

#### 2.1 Logging and Monitoring

**Structured Logging:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Use in middleware
export const debugMiddleware = (req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });
  next();
};
```

#### 2.2 API Testing

**Using curl:**
```bash
# Test r.jina endpoint
curl -X POST http://localhost:3000/api/bookmarks/r.jina \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://r.jina.ai/http://example.com"}'

# Test with verbose output
curl -v -X POST http://localhost:3000/api/bookmarks/r.jina \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://r.jina.ai/http://example.com"}'
```

**Using Postman:**
- Create collections for r.jina endpoints
- Set up environment variables for tokens
- Add tests for response validation
- Monitor response times and errors

#### 2.3 Database Debugging

**Query Logging:**
```typescript
// Enable query logging in database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: console.log, // Log all queries
  dialectOptions: {
    debug: true
  }
});
```

**Manual Database Queries:**
```sql
-- Check bookmark data
SELECT * FROM bookmarks WHERE converted_to_jina = true LIMIT 10;

-- Check for errors in recent operations
SELECT * FROM audit_log WHERE operation LIKE '%jina%' ORDER BY created_at DESC;

-- Monitor database performance
SHOW PROCESSLIST;
EXPLAIN SELECT * FROM bookmarks WHERE converted_to_jina = true;
```

## Database Migration Troubleshooting

### 1. Migration Failures

#### 1.1 Syntax Errors

**Problem:** Migration fails due to SQL syntax errors.

**Solutions:**

1. **Test SQL in Database Client:**
```sql
-- Test the migration SQL directly
ALTER TABLE bookmarks ADD COLUMN converted_to_jina BOOLEAN DEFAULT FALSE;

-- Verify the column was added
DESCRIBE bookmarks;
```

2. **Check Migration File Structure:**
```javascript
// Ensure proper migration file structure
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bookmarks', 'converted_to_jina', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bookmarks', 'converted_to_jina');
  }
};
```

#### 1.2 Constraint Violations

**Problem:** Migration fails due to constraint violations.

**Solutions:**

1. **Check Existing Data:**
```sql
-- Check for data that might violate new constraints
SELECT * FROM bookmarks WHERE url IS NULL;

-- Handle problematic data before migration
UPDATE bookmarks SET url = 'http://example.com' WHERE url IS NULL;
```

2. **Use Conditional Migration:**
```javascript
up: async (queryInterface, Sequelize) => {
  // Check if column already exists
  const tableInfo = await queryInterface.describeTable('bookmarks');
  if (!tableInfo.converted_to_jina) {
    await queryInterface.addColumn('bookmarks', 'converted_to_jina', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  }
}
```

### 2. Data Integrity Issues

#### 2.1 Null Values in Required Fields

**Problem:** New r.jina fields have unexpected null values.

**Solutions:**

1. **Set Default Values:**
```sql
-- Update existing records
UPDATE bookmarks SET converted_to_jina = false WHERE converted_to_jina IS NULL;
UPDATE bookmarks SET jina_url = url WHERE jina_url IS NULL AND converted_to_jina = true;
```

2. **Add Constraints:**
```sql
-- Add NOT NULL constraints after data cleanup
ALTER TABLE bookmarks ALTER COLUMN converted_to_jina SET NOT NULL;
ALTER TABLE bookmarks ALTER COLUMN jina_url SET NOT NULL;
```

#### 2.2 Data Migration Problems

**Problem:** Existing bookmarks need to be converted to r.jina format.

**Solutions:**

1. **Create Data Migration Script:**
```javascript
// scripts/migrate-to-jina.js
const { Bookmark } = require('../models');

async function migrateToJina() {
  const bookmarks = await Bookmark.findAll({
    where: { converted_to_jina: false }
  });
  
  for (const bookmark of bookmarks) {
    try {
      const jinaUrl = `https://r.jina.ai/${bookmark.url}`;
      await bookmark.update({
        jina_url: jinaUrl,
        converted_to_jina: true
      });
      console.log(`Migrated bookmark ${bookmark.id} to r.jina format`);
    } catch (error) {
      console.error(`Failed to migrate bookmark ${bookmark.id}:`, error);
    }
  }
}

migrateToJina().catch(console.error);
```

## Permission and Access Control Issues

### 1. Authentication Problems

#### 1.1 Token Validation Failures

**Problem:** JWT tokens are not being validated correctly.

**Solutions:**

1. **Check Token Format:**
```typescript
// Verify token format
const token = req.headers.authorization?.split(' ')[1];
if (!token || !token.includes('.')) {
  return res.status(401).json({ error: 'Invalid token format' });
}
```

2. **Verify Secret Key:**
```typescript
// Ensure JWT secret is consistent
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable not set');
}
```

#### 1.2 Session Management Issues

**Problem:** User sessions are not being maintained properly.

**Solutions:**

1. **Check Cookie Configuration:**
```typescript
// Verify cookie settings
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

2. **Debug Session Storage:**
```typescript
// Add session debugging
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  next();
});
```

### 2. Authorization Problems

#### 2.1 Permission Checking Failures

**Problem:** Users are being denied access despite having proper permissions.

**Solutions:**

1. **Verify Permission Logic:**
```typescript
// Debug permission checking
export const checkPermissions = (requiredPermission) => {
  return async (req, res, next) => {
    console.log('User permissions:', req.user?.permissions);
    console.log('Required permission:', requiredPermission);
    
    const hasPermission = req.user?.permissions?.includes(requiredPermission);
    console.log('Permission check result:', hasPermission);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

2. **Check Permission Assignment:**
```sql
-- Verify user permissions in database
SELECT u.username, p.permission_name 
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.username = 'testuser';
```

#### 2.2 Agent Key Restrictions

**Problem:** Agent keys are being incorrectly processed or blocked.

**Solutions:**

1. **Verify Agent Key Validation:**
```typescript
// Debug agent key processing
export const validateAgentKey = (req, res, next) => {
  const agentKey = req.body.agentKey || req.headers['x-agent-key'];
  
  if (agentKey) {
    console.log('Agent key detected:', agentKey);
    console.log('Request path:', req.path);
    
    // Check if endpoint allows agent access
    if (req.path.includes('/r.jina')) {
      return res.status(403).json({ 
        error: 'Agent access not permitted for r.jina endpoints' 
      });
    }
  }
  
  next();
};
```

2. **Check Agent Key Database:**
```sql
-- Verify agent key exists and is active
SELECT * FROM agent_keys 
WHERE key = 'your-agent-key' 
AND is_active = true 
AND expires_at > NOW();
```

## Performance Optimization Tips

### 1. Frontend Performance

#### 1.1 Component Optimization

**Problem:** r.jina conversion causes slow rendering or poor user experience.

**Solutions:**

1. **Implement Lazy Loading:**
```typescript
// Lazy load heavy components
const JinaConversionModal = lazy(() => import('./JinaConversionModal'));

// Use Suspense for loading states
<Suspense fallback={<div>Loading conversion options...</div>}>
  <JinaConversionModal />
</Suspense>
```

2. **Optimize State Updates:**
```typescript
// Use memoization for expensive calculations
const conversionResult = useMemo(() => {
  if (!state.url || !state.convertToJina) {
    return state.url;
  }
  return convertToJinaUrl(state.url);
}, [state.url, state.convertToJina]);

// Debounce rapid state changes
const debouncedUrl = useDebounce(state.url, 300);
```

#### 1.2 API Call Optimization

**Problem:** Multiple API calls causing performance issues.

**Solutions:**

1. **Implement Request Caching:**
```typescript
// Cache API responses
const useJinaContent = (url) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const cached = sessionStorage.getItem(`jina_${url}`);
    if (cached) {
      setContent(JSON.parse(cached));
      return;
    }
    
    const fetchContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/bookmarks/r.jina`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await response.json();
        setContent(data.content);
        sessionStorage.setItem(`jina_${url}`, JSON.stringify(data.content));
      } catch (error) {
        console.error('Failed to fetch content:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [url]);
  
  return { content, loading };
};
```

2. **Implement Request Deduplication:**
```typescript
// Prevent duplicate requests
const pendingRequests = new Map();

const fetchJinaContent = async (url) => {
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }
  
  const request = fetch(`/api/bookmarks/r.jina`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  }).then(res => res.json());
  
  pendingRequests.set(url, request);
  
  try {
    const result = await request;
    return result;
  } finally {
    pendingRequests.delete(url);
  }
};
```

### 2. Backend Performance

#### 2.1 Database Query Optimization

**Problem:** Database queries for r.jina bookmarks are slow.

**Solutions:**

1. **Add Database Indexes:**
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_bookmarks_converted_to_jina ON bookmarks(converted_to_jina);
CREATE INDEX idx_bookmarks_jina_url ON bookmarks(jina_url);

-- Composite index for common query patterns
CREATE INDEX idx_bookmarks_user_jina ON bookmarks(user_id, converted_to_jina);
```

2. **Optimize Query Patterns:**
```typescript
// Use efficient queries
const getJinaBookmarks = async (userId) => {
  return await Bookmark.findAll({
    where: {
      user_id: userId,
      converted_to_jina: true
    },
    attributes: ['id', 'title', 'jina_url', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 50
  });
};
```

#### 2.2 External API Performance

**Problem:** r.jina.ai API calls are slow or timing out.

**Solutions:**

1. **Implement Circuit Breaker:**
```typescript
// Add circuit breaker pattern
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

2. **Implement Response Caching:**
```typescript
// Cache r.jina.ai responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const fetchWithCache = async (url) => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetch(url);
  cache.set(url, { data, timestamp: Date.now() });
  
  // Clean up old cache entries
  if (cache.size > 1000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  return data;
};
```

### 3. Memory Management

#### 3.1 Frontend Memory Leaks

**Problem:** Memory usage increases over time with r.jina features.

**Solutions:**

1. **Clean Up Event Listeners:**
```typescript
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

2. **Manage Large Content:**
```typescript
// Limit content size in memory
const MAX_CONTENT_SIZE = 1024 * 1024; // 1MB

const processContent = (content) => {
  if (content.length > MAX_CONTENT_SIZE) {
    return content.substring(0, MAX_CONTENT_SIZE) + '...';
  }
  return content;
};
```

#### 3.2 Backend Memory Optimization

**Problem:** Server memory usage increases with r.jina operations.

**Solutions:**

1. **Implement Stream Processing:**
```typescript
// Process large responses in chunks
const processLargeResponse = (response) => {
  return new Promise((resolve, reject) => {
    let content = '';
    let size = 0;
    
    response.body.on('data', (chunk) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) { // 10MB limit
        response.destroy();
        reject(new Error('Content too large'));
        return;
      }
      content += chunk;
    });
    
    response.body.on('end', () => {
      resolve(content);
    });
    
    response.body.on('error', reject);
  });
};
```

2. **Use Connection Pooling:**
```typescript
// Configure database connection pooling
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});
```

## Monitoring and Alerting

### 1. Performance Monitoring

#### 1.1 Frontend Metrics

**Key Metrics to Monitor:**
- Component render times
- API response times
- Memory usage
- Error rates

**Implementation:**
```typescript
// Performance monitoring
const monitorPerformance = () => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');
  
  console.log('Page load time:', navigation.loadEventEnd - navigation.loadEventStart);
  console.log('First paint:', paint[0]?.startTime);
  
  // Send metrics to monitoring service
  sendMetrics({
    pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
    firstPaint: paint[0]?.startTime,
    timestamp: Date.now()
  });
};
```

#### 1.2 Backend Metrics

**Key Metrics to Monitor:**
- API response times
- Database query performance
- Error rates
- Memory usage

**Implementation:**
```typescript
// API performance monitoring
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        userAgent: req.headers['user-agent']
      });
    }
    
    // Send metrics
    sendMetrics({
      endpoint: req.path,
      method: req.method,
      duration,
      status: res.statusCode,
      timestamp: Date.now()
    });
  });
  
  next();
});
```

### 2. Error Monitoring

#### 2.1 Frontend Error Tracking

**Implementation:**
```typescript
// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Frontend error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  });
});

// React error boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error('React error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    
    return this.props.children;
  }
}
```

#### 2.2 Backend Error Tracking

**Implementation:**
```typescript
// Global error handler
app.use((error, req, res, next) => {
  logger.error('Backend error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent']
  });
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});
```

This comprehensive troubleshooting guide should help developers identify and resolve common issues encountered during the implementation and operation of the r.jina.ai feature in ClawChives bookmark manager.
