/**
 * ClawChives REST API Client
 * Handles communication with the backend for bookmark operations
 */



// API Key format: api-[32 random chars]
export const API_KEY_PREFIX = "api-";
export const API_KEY_LENGTH = 32;

export interface Bookmark {
  id?: string;
  url: string;
  title: string;
  description: string;
  favicon: string;
  tags: string[];
  folderId?: string;
  starred: boolean;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiKeyResponse {
  key: string;
  createdAt: string;
}

/**
 * Simulates the REST API backend
 * In production, this would make actual HTTP requests to your Node.js/Express server
 */
class ApiClient {
  private apiKey: string | null = null;

  constructor(_baseUrl: string = "/api") {
  }

  /**
   * Set the API key for authentication
   */
  setApiKey(key: string) {
    if (!key.startsWith(API_KEY_PREFIX)) {
      throw new Error("Invalid API key format. Must start with 'api-'");
    }
    this.apiKey = key;
  }

  /**
   * Generate a new API key (admin only)
   */
  async generateApiKey(): Promise<ApiResponse<ApiKeyResponse>> {
    // Simulate server-side generation
    const key = `${API_KEY_PREFIX}${this.generateRandomString(API_KEY_LENGTH)}`;
    
    return {
      success: true,
      data: {
        key,
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Add a new bookmark
   * POST /api/bookmarks
   */
  async addBookmark(bookmark: Bookmark): Promise<ApiResponse<Bookmark>> {
    if (!this.apiKey) {
      return { success: false, error: "Unauthorized: No API key provided" };
    }

    try {
      // Simulate API call
      const response = await this.mockRequest<Bookmark>("POST", "/bookmarks", bookmark);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add bookmark",
      };
    }
  }

  /**
   * Update an existing bookmark
   * PUT /api/bookmarks/:id
   */
  async updateBookmark(id: string, bookmark: Partial<Bookmark>): Promise<ApiResponse<Bookmark>> {
    if (!this.apiKey) {
      return { success: false, error: "Unauthorized: No API key provided" };
    }

    try {
      const response = await this.mockRequest<Bookmark>("PUT", `/bookmarks/${id}`, bookmark);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update bookmark",
      };
    }
  }

  /**
   * Delete a bookmark
   * DELETE /api/bookmarks/:id
   */
  async deleteBookmark(id: string): Promise<ApiResponse<void>> {
    if (!this.apiKey) {
      return { success: false, error: "Unauthorized: No API key provided" };
    }

    try {
      const response = await this.mockRequest<void>("DELETE", `/bookmarks/${id}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete bookmark",
      };
    }
  }

  /**
   * Get all bookmarks
   * GET /api/bookmarks
   */
  async getBookmarks(filters?: {
    starred?: boolean;
    archived?: boolean;
    folderId?: string;
    tags?: string[];
    search?: string;
  }): Promise<ApiResponse<Bookmark[]>> {
    if (!this.apiKey) {
      return { success: false, error: "Unauthorized: No API key provided" };
    }

    try {
      const queryParams = new URLSearchParams();
      if (filters?.starred) queryParams.append("starred", "true");
      if (filters?.archived) queryParams.append("archived", "true");
      if (filters?.folderId) queryParams.append("folderId", filters.folderId);
      if (filters?.tags) filters.tags.forEach((tag) => queryParams.append("tags", tag));
      if (filters?.search) queryParams.append("search", filters.search);

      const response = await this.mockRequest<Bookmark[]>(
        "GET",
        `/bookmarks?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch bookmarks",
      };
    }
  }

  /**
   * Validate an API key
   * POST /api/auth/validate
   */
  async validateApiKey(): Promise<ApiResponse<{ valid: boolean; keyType: string }>> {
    if (!this.apiKey) {
      return { success: false, error: "No API key provided" };
    }

    try {
      // Check key type
      let keyType = "unknown";
      if (this.apiKey.startsWith("hu-")) keyType = "human";
      else if (this.apiKey.startsWith("lb-")) keyType = "agent";
      else if (this.apiKey.startsWith("api-")) keyType = "api";

      return {
        success: true,
        data: {
          valid: true,
          keyType,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Invalid API key",
      };
    }
  }

  /**
   * Helper method to generate random strings
   */
  private generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  /**
   * Mock HTTP request (simulates server communication)
   * In production, replace with actual fetch() calls
   */
  private async mockRequest<T>(
    _method: string,
    _endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In a real implementation, this would be:
    // const response = await fetch(`${this.baseUrl}${endpoint}`, {
    //   method,
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${this.apiKey}`,
    //   },
    //   body: body ? JSON.stringify(body) : undefined,
    // });
    // const data = await response.json();
    // return data;

    // For now, return success
    return { success: true, data: body as T };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

/**
 * Example backend server implementation (Node.js/Express)
 * This is what the actual backend would look like
 * 
 * 
 * import express from 'express';
 * import crypto from 'crypto';
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * // Middleware to validate API keys
 * const validateApiKey = (req: any, res: any, next: any) => {
 *   const authHeader = req.headers.authorization;
 *   if (!authHeader || !authHeader.startsWith('Bearer ')) {
 *     return res.status(401).json({ success: false, error: 'Unauthorized' });
 *   }
 *   
 *   const key = authHeader.substring(7);
 *   // Validate key against database
 *   if (!isValidKey(key)) {
 *     return res.status(401).json({ success: false, error: 'Invalid API key' });
 *   }
 *   
 *   req.apiKey = key;
 *   next();
 * };
 * 
 * // Generate API Key endpoint
 * app.post('/api/keys/generate', async (req, res) => {
 *   const key = `api-${crypto.randomBytes(16).toString('hex')}`;
 *   // Save to database...
 *   res.json({ success: true, data: { key, createdAt: new Date().toISOString() } });
 * });
 * 
 * // Bookmark endpoints
 * app.get('/api/bookmarks', validateApiKey, async (req, res) => {
 *   // Fetch bookmarks from database...
 *   res.json({ success: true, data: [] });
 * });
 * 
 * app.post('/api/bookmarks', validateApiKey, async (req, res) => {
 *   // Create bookmark...
 *   res.json({ success: true, data: req.body });
 * });
 * 
 * app.put('/api/bookmarks/:id', validateApiKey, async (req, res) => {
 *   // Update bookmark...
 *   res.json({ success: true, data: req.body });
 * });
 * 
 * app.delete('/api/bookmarks/:id', validateApiKey, async (req, res) => {
 *   // Delete bookmark...
 *   res.json({ success: true });
 * });
 * 
 * app.listen(3000, () => console.log('ClawChives API running on port 3000'));
 * 
 */