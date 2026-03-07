import rateLimit from "express-rate-limit";

function parseWindow(windowStr) {
  if (!windowStr) return null;
  if (windowStr.endsWith("m")) return parseInt(windowStr) * 60 * 1000;
  if (windowStr.endsWith("s")) return parseInt(windowStr) * 1000;
  return parseInt(windowStr);
}

export const authLimiter = rateLimit({
  windowMs: parseWindow(process.env.AUTH_RATE_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT || "10", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "The Reef is crowded! Too many login attempts. Please rest your claws and try again later."
  },
  skipSuccessfulRequests: true, // Only limit failed logins
});

export const apiLimiter = rateLimit({
  windowMs: parseWindow(process.env.API_RATE_WINDOW) || 1 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "The Reef is crowded! You've exceeded your rate limit. Please slow down your requests."
  },
});

export const createAgentKeyRateLimiter = (db) => {
  // Cache limiters per agent api_key so each key gets a persistent window counter
  const limiterCache = new Map();

  return async (req, res, next) => {
    // Skip if no rate limiting info is expected
    if (req.keyType === "human" || !req.apiKey) {
       return next();
    }

    let limit = null;
    let agentApiKey = null;

    if (req.keyType === "agent") {
      const agent = db.prepare("SELECT api_key, rate_limit FROM agent_keys WHERE api_key = ? AND is_active = 1").get(req.apiKey);
      if (agent && agent.rate_limit) { limit = agent.rate_limit; agentApiKey = agent.api_key; }
    } else if (req.keyType === "api") {
       const token = db.prepare("SELECT owner_key, owner_type FROM api_tokens WHERE key = ?").get(req.apiKey);
       if (token && token.owner_type === "agent") {
         const agent = db.prepare("SELECT api_key, rate_limit FROM agent_keys WHERE api_key = ? AND is_active = 1").get(token.owner_key);
         if (agent && agent.rate_limit) { limit = agent.rate_limit; agentApiKey = agent.api_key; }
       }
    }

    if (!limit || !agentApiKey) return next();

    // Reuse existing limiter for this agent key, or create one and cache it
    if (!limiterCache.has(agentApiKey)) {
      const cacheKey = agentApiKey;
      limiterCache.set(cacheKey, rateLimit({
        windowMs: 60 * 1000,
        max: limit,
        keyGenerator: () => cacheKey,
        message: {
          success: false,
          error: "Your carapace lacks the capacity! Agent rate limit exceeded."
        }
      }));
    }

    limiterCache.get(agentApiKey)(req, res, next);
  };
};
