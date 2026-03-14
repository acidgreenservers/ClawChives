# Security Guidelines for r.jina.ai Feature Implementation

## Overview

This document outlines comprehensive security guidelines for implementing the r.jina.ai feature in ClawChives bookmark manager. The guidelines cover human-only access controls, permission checking, agent key restrictions, and security best practices for proxy endpoints.

## Security Architecture

### 1. Human-Only Access Control Implementation

#### 1.1 User Agent Verification

Implement strict user agent validation to ensure only human users can access r.jina.ai endpoints:

```typescript
// middleware/humanAccessControl.ts
export const humanAccessControl = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const agentKey = req.body.agentKey || req.headers['x-agent-key'];
  
  // Block known bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /requests/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'BOT_DETECTED',
        message: 'Automated access is not permitted'
      }
    });
  }
  
  // Block agent key usage for r.jina endpoints
  if (agentKey && req.path.includes('/r.jina')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AGENT_ACCESS_DENIED',
        message: 'Agent access is not permitted for r.jina.ai endpoints'
      }
    });
  }
  
  next();
};
```

#### 1.2 Session Validation

Ensure active user sessions for all r.jina.ai requests:

```typescript
// middleware/sessionValidation.ts
export const validateActiveSession = async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.cookies.sessionId || req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_SESSION',
        message: 'No active session found'
      }
    });
  }
  
  try {
    const session = await SessionService.validateSession(sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired'
        }
      });
    }
    
    req.user = session.user;
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_VALIDATION_ERROR',
        message: 'Failed to validate session'
      }
    });
  }
};
```

#### 1.3 Permission Checking

Implement granular permission checking for r.jina.ai operations:

```typescript
// middleware/permissionCheck.ts
export const checkBookmarkPermissions = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }
    
    try {
      const hasPermission = await PermissionService.hasPermission(
        user.id, 
        requiredPermission
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for this operation'
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Failed to check permissions'
        }
      });
    }
  };
};
```

### 2. Agent Key Restrictions and Validation

#### 2.1 Agent Key Structure

Define secure agent key format and validation:

```typescript
// types/agentKey.ts
interface AgentKey {
  id: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  lastUsed?: Date;
}

// utils/agentKeyValidator.ts
export class AgentKeyValidator {
  static validateAgentKeyFormat(key: string): boolean {
    // Agent keys should follow a specific format
    const agentKeyPattern = /^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/;
    return agentKeyPattern.test(key);
  }
  
  static async validateAgentKey(key: string): Promise<AgentKey | null> {
    if (!this.validateAgentKeyFormat(key)) {
      return null;
    }
    
    try {
      const agentKey = await AgentKeyService.findByKey(key);
      
      if (!agentKey || !agentKey.isActive) {
        return null;
      }
      
      if (agentKey.expiresAt < new Date()) {
        await AgentKeyService.deactivateKey(key);
        return null;
      }
      
      // Update last used timestamp
      await AgentKeyService.updateLastUsed(key);
      
      return agentKey;
    } catch (error) {
      console.error('Agent key validation error:', error);
      return null;
    }
  }
  
  static isRestrictedForEndpoint(agentKey: AgentKey, endpoint: string): boolean {
    // r.jina.ai endpoints are restricted for all agent keys
    if (endpoint.includes('/r.jina')) {
      return true;
    }
    
    // Check if agent key has required permissions for the endpoint
    const requiredPermissions = this.getRequiredPermissions(endpoint);
    return !requiredPermissions.every(permission => 
      agentKey.permissions.includes(permission)
    );
  }
  
  private static getRequiredPermissions(endpoint: string): string[] {
    // Define permission requirements for different endpoints
    const permissionMap: Record<string, string[]> = {
      '/api/bookmarks/r.jina': [], // Blocked for all agents
      '/api/bookmarks': ['bookmark:create'],
      '/api/bookmarks/:id': ['bookmark:read', 'bookmark:update', 'bookmark:delete']
    };
    
    return permissionMap[endpoint] || [];
  }
}
```

#### 2.2 Agent Key Rate Limiting

Implement strict rate limiting for agent keys:

```typescript
// middleware/agentRateLimit.ts
export const agentRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const agentKey = req.body.agentKey || req.headers['x-agent-key'];
  
  if (!agentKey) {
    return next();
  }
  
  const clientIp = req.ip || req.connection.remoteAddress;
  const key = `agent:${agentKey}:${clientIp}`;
  
  // Check rate limit (agents have stricter limits)
  const currentRequests = RateLimitService.getCurrentRequests(key);
  const maxRequests = 10; // Agents: 10 requests per hour
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  if (currentRequests >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for agent key'
      }
    });
  }
  
  RateLimitService.incrementRequest(key, windowMs);
  next();
};
```

### 3. Security Best Practices for Proxy Endpoints

#### 3.1 URL Validation and Sanitization

Implement comprehensive URL validation for r.jina.ai requests:

```typescript
// utils/urlValidator.ts
export class URLValidator {
  static readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];
  static readonly BLOCKED_DOMAINS = [
    'localhost', '127.0.0.1', '::1',
    '192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
    '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'
  ];
  
  static validateJinaURL(url: string): ValidationResult {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a valid r.jina.ai URL
      if (!urlObj.hostname.endsWith('r.jina.ai')) {
        return {
          isValid: false,
          error: 'URL must be a valid r.jina.ai URL'
        };
      }
      
      // Extract the target URL
      const targetUrl = url.replace(/^https:\/\/r\.jina\.ai\//, '');
      const targetUrlObj = new URL(targetUrl);
      
      // Validate target URL
      const targetValidation = this.validateTargetURL(targetUrlObj);
      if (!targetValidation.isValid) {
        return targetValidation;
      }
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }
  
  private static validateTargetURL(url: URL): ValidationResult {
    // Check protocol
    if (!this.ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS protocols are allowed'
      };
    }
    
    // Check for blocked domains/IPs
    const hostname = url.hostname.toLowerCase();
    if (this.BLOCKED_DOMAINS.some(blocked => hostname.includes(blocked))) {
      return {
        isValid: false,
        error: 'Access to internal/private networks is not allowed'
      };
    }
    
    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(url)) {
      return {
        isValid: false,
        error: 'URL contains suspicious patterns'
      };
    }
    
    return { isValid: true };
  }
  
  private static hasSuspiciousPatterns(url: URL): boolean {
    const suspiciousPatterns = [
      /\/etc\/passwd/i,
      /\/etc\/shadow/i,
      /\/proc\/self/i,
      /\/sys\/class/i,
      /\.\.\/\.\./i,
      /localhost.*:.*[0-9]/i
    ];
    
    return suspiciousPatterns.some(pattern => 
      pattern.test(url.href) || pattern.test(url.pathname)
    );
  }
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}
```

#### 3.2 Content Filtering and Sanitization

Implement content filtering for responses from r.jina.ai:

```typescript
// utils/contentFilter.ts
export class ContentFilter {
  static readonly MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB
  static readonly MALICIOUS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /onload=/gi,
    /onerror=/gi,
    /onmouseover=/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi
  ];
  
  static filterContent(content: string): FilterResult {
    // Check content length
    if (content.length > this.MAX_CONTENT_LENGTH) {
      return {
        isSafe: false,
        error: 'Content exceeds maximum allowed length'
      };
    }
    
    // Check for malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        return {
          isSafe: false,
          error: 'Content contains potentially malicious code'
        };
      }
    }
    
    // Sanitize HTML content
    const sanitizedContent = this.sanitizeHTML(content);
    
    return {
      isSafe: true,
      content: sanitizedContent
    };
  }
  
  private static sanitizeHTML(content: string): string {
    // Remove potentially dangerous HTML tags and attributes
    return content
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }
}

interface FilterResult {
  isSafe: boolean;
  content?: string;
  error?: string;
}
```

#### 3.3 Request Timeout and Circuit Breaker

Implement timeout and circuit breaker patterns for external requests:

```typescript
// services/jinaProxyService.ts
export class JinaProxyService {
  private static readonly TIMEOUT_MS = 30000;
  private static readonly MAX_RETRIES = 3;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  
  static async fetchContent(url: string): Promise<string> {
    // Check circuit breaker
    if (CircuitBreakerService.isOpen('jina-proxy')) {
      throw new Error('Circuit breaker is open - service temporarily unavailable');
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ClawChives/1.0 (Human Access Only)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      const filteredResult = ContentFilter.filterContent(content);
      
      if (!filteredResult.isSafe) {
        throw new Error(filteredResult.error || 'Content filtering failed');
      }
      
      CircuitBreakerService.recordSuccess('jina-proxy');
      return filteredResult.content!;
    } catch (error) {
      CircuitBreakerService.recordFailure('jina-proxy');
      throw error;
    }
  }
}
```

### 4. Audit Logging Requirements

#### 4.1 Security Event Logging

Implement comprehensive logging for all security-related events:

```typescript
// utils/securityLogger.ts
export class SecurityLogger {
  static logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event_type: event.type,
      user_id: event.userId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      endpoint: event.endpoint,
      details: event.details,
      severity: event.severity
    };
    
    // Log to file
    this.writeToFile(logEntry);
    
    // Log to external service if configured
    if (process.env.SECURITY_LOG_ENDPOINT) {
      this.sendToExternalService(logEntry);
    }
    
    // Alert on high-severity events
    if (event.severity === 'high') {
      this.sendAlert(logEntry);
    }
  }
  
  private static writeToFile(entry: any): void {
    const logDir = process.env.SECURITY_LOG_DIR || './logs';
    const logFile = `${logDir}/security-${new Date().toISOString().split('T')[0]}.log`;
    
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logFile, logLine);
  }
  
  private static async sendToExternalService(entry: any): Promise<void> {
    try {
      await fetch(process.env.SECURITY_LOG_ENDPOINT!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send security log to external service:', error);
    }
  }
  
  private static sendAlert(entry: any): void {
    // Send alert via email, Slack, or other notification service
    const alertMessage = `
Security Alert: ${entry.event_type}
Time: ${entry.timestamp}
User: ${entry.user_id}
IP: ${entry.ip_address}
Details: ${JSON.stringify(entry.details, null, 2)}
    `;
    
    // Implementation depends on notification service
    NotificationService.sendAlert(alertMessage);
  }
}

interface SecurityEvent {
  type: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

#### 4.2 Audit Trail for r.jina Operations

Log all r.jina.ai operations for audit purposes:

```typescript
// middleware/auditTrail.ts
export const auditTrail = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  const securityEvent: SecurityEvent = {
    type: 'rjina_request',
    userId: req.user?.id,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    endpoint: req.path,
    details: {
      method: req.method,
      body: req.body,
      query: req.query
    },
    severity: 'low'
  };
  
  SecurityLogger.logSecurityEvent(securityEvent);
  
  // Log response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    
    const responseEvent: SecurityEvent = {
      type: 'rjina_response',
      userId: req.user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      endpoint: req.path,
      details: {
        status: res.statusCode,
        duration,
        responseSize: body ? body.length : 0
      },
      severity: res.statusCode >= 400 ? 'medium' : 'low'
    };
    
    SecurityLogger.logSecurityEvent(responseEvent);
    return originalSend.call(this, body);
  };
  
  next();
};
```

### 5. Additional Security Measures

#### 5.1 CORS Configuration

Configure CORS to prevent unauthorized cross-origin requests:

```typescript
// middleware/corsConfig.ts
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Key'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset']
};
```

#### 5.2 Input Validation Middleware

Implement comprehensive input validation:

```typescript
// middleware/inputValidation.ts
export const validateJinaRequest = (req: Request, res: Response, next: NextFunction) => {
  const { url, agentKey } = req.body;
  
  // Validate URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'URL is required and must be a string'
      }
    });
  }
  
  // Validate agent key format if provided
  if (agentKey && !AgentKeyValidator.validateAgentKeyFormat(agentKey)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_AGENT_KEY',
        message: 'Invalid agent key format'
      }
    });
  }
  
  // Additional validation rules
  if (url.length > 2048) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'URL_TOO_LONG',
        message: 'URL exceeds maximum length'
      }
    });
  }
  
  next();
};
```

#### 5.3 Security Headers

Add security headers to all responses:

```typescript
// middleware/securityHeaders.ts
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};
```

This comprehensive security framework ensures that the r.jina.ai feature implementation maintains the highest security standards while providing robust protection against various attack vectors.
