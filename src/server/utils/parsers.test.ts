import { describe, it, expect } from 'vitest';
import { parseBookmark, parseFolder, parseAgentKey } from './parsers';

describe('parsers', () => {
  describe('parseBookmark', () => {
    it('should return null if row is null', () => {
      expect(parseBookmark(null)).toBeNull();
    });

    it('should parse tags and convert fields to camelCase', () => {
      const row = {
        id: 1,
        title: 'Test Bookmark',
        tags: '["tag1", "tag2"]',
        starred: 1,
        archived: 0,
        folder_id: 10,
        jina_url: 'http://jina.url',
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        user_uuid: 'user-123'
      };

      const result = parseBookmark(row);

      expect(result).toEqual({
        id: 1,
        title: 'Test Bookmark',
        tags: ['tag1', 'tag2'],
        starred: true,
        archived: false,
        folderId: 10,
        jinaUrl: 'http://jina.url',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-02',
        folder_id: undefined,
        jina_url: undefined,
        jina_conversion_url: undefined,
        created_at: undefined,
        updated_at: undefined,
        user_uuid: undefined,
      });
    });

    it('should default tags to empty array if missing', () => {
      const row = { starred: 0, archived: 0 };
      const result = parseBookmark(row);
      expect(result.tags).toEqual([]);
    });

    it('should prioritize jina_conversion_url over jina_url', () => {
      const row = {
        jina_url: 'http://jina.url',
        jina_conversion_url: 'http://jina.conversion.url',
        starred: 0,
        archived: 0
      };
      const result = parseBookmark(row);
      expect(result.jinaUrl).toBe('http://jina.conversion.url');
    });

    it('should use jina_url if jina_conversion_url is missing', () => {
      const row = {
        jina_url: 'http://jina.url',
        starred: 0,
        archived: 0
      };
      const result = parseBookmark(row);
      expect(result.jinaUrl).toBe('http://jina.url');
    });
  });

  describe('parseFolder', () => {
    it('should return null if row is null', () => {
      expect(parseFolder(null)).toBeNull();
    });

    it('should convert fields to camelCase and remove snake_case dupes', () => {
      const row = {
        id: 1,
        name: 'Test Folder',
        parent_id: 5,
        created_at: '2023-01-01',
        user_uuid: 'user-123'
      };

      const result = parseFolder(row);

      expect(result).toEqual({
        id: 1,
        name: 'Test Folder',
        parentId: 5,
        createdAt: '2023-01-01',
        parent_id: undefined,
        created_at: undefined,
        user_uuid: undefined,
      });
    });
  });

  describe('parseAgentKey', () => {
    it('should return null if row is null', () => {
      expect(parseAgentKey(null)).toBeNull();
    });

    it('should parse permissions and convert fields to camelCase', () => {
      const row = {
        id: 1,
        permissions: '{"read": true}',
        is_active: 1,
        expiration_type: 'never',
        expiration_date: null,
        rate_limit: 100,
        created_at: '2023-01-01',
        last_used: '2023-01-05',
        api_key: 'lb-123',
        user_uuid: 'user-123'
      };

      const result = parseAgentKey(row);

      expect(result).toEqual({
        id: 1,
        permissions: { read: true },
        isActive: true,
        expirationType: 'never',
        expirationDate: null,
        rateLimit: 100,
        createdAt: '2023-01-01',
        lastUsed: '2023-01-05',
        apiKey: 'lb-123',
        is_active: undefined,
        expiration_type: undefined,
        expiration_date: undefined,
        rate_limit: undefined,
        created_at: undefined,
        last_used: undefined,
        user_uuid: undefined,
        api_key: undefined,
      });
    });

    it('should default permissions to empty object if missing', () => {
      const row = { is_active: 1 };
      const result = parseAgentKey(row);
      expect(result.permissions).toEqual({});
    });
  });
});
