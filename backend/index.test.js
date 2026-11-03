import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
const { createApp } = require('./index');

describe('Backend API Tests', () => {
  let mockRecipes = [];
  let app;

  beforeEach(() => {
    // Reset mock recipes before each test
    mockRecipes = [
      {
        id: 'recipe-1',
        title: 'カレーライス',
        isFavorite: true,
        notes: '辛口がおすすめ',
        link: 'https://example.com/curry',
        ingredients: [{ name: '玉ねぎ', quantity: '2個' }],
        steps: [{ description: '炒める', imageUrls: [] }],
        userId: 'test-user-123',
      },
      {
        id: 'recipe-2',
        title: '肉じゃが',
        isFavorite: false,
        notes: '落とし蓋をする',
        link: '',
        ingredients: [{ name: 'じゃがいも', quantity: '3個' }],
        steps: [{ description: '煮込む', imageUrls: [] }],
        userId: 'test-user-123',
      },
    ];

    const mockAuth = {
      verifyIdToken: vi.fn(async (token) => {
        if (token === 'valid-token') {
          return { uid: 'test-user-123', email: 'test@example.com' };
        }
        throw new Error('Invalid token');
      }),
    };

    const mockDb = {
      collection: vi.fn(() => ({
        select: vi.fn((...fields) => ({
          get: vi.fn(async () => ({
            docs: mockRecipes.map((r) => ({
              id: r.id,
              data: () => {
                const res = {};
                fields.forEach((f) => {
                  if (r[f] !== undefined) res[f] = r[f];
                });
                return res;
              },
            })),
          })),
        })),
        get: vi.fn(async () => ({
          docs: mockRecipes.map((r) => ({
            id: r.id,
            data: () => ({ ...r }),
          })),
        })),
        add: vi.fn(async (newRecipe) => {
          const id = `recipe-${mockRecipes.length + 1}`;
          const doc = { id, ...newRecipe };
          mockRecipes.push(doc);
          return { id };
        }),
        doc: vi.fn((docId) => ({
          get: vi.fn(async () => {
            const found = mockRecipes.find((r) => r.id === docId);
            return {
              exists: !!found,
              id: docId,
              data: () => (found ? { ...found } : undefined),
            };
          }),
          update: vi.fn(async (updatedData) => {
            const index = mockRecipes.findIndex((r) => r.id === docId);
            if (index !== -1) {
              mockRecipes[index] = { ...mockRecipes[index], ...updatedData };
            }
          }),
          delete: vi.fn(async () => {
            mockRecipes = mockRecipes.filter((r) => r.id !== docId);
          }),
        })),
      })),
    };

    const mockBucket = {
      name: 'test-bucket',
      file: vi.fn(() => ({
        createWriteStream: vi.fn(),
        makePublic: vi.fn(),
      })),
    };

    app = createApp({
      auth: mockAuth,
      db: mockDb,
      bucket: mockBucket,
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 403 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/recipes');
      expect(res.status).toBe(403);
    });

    it('should return 403 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(403);
    });

    it('should pass when token is valid', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/recipes (Summary List & ETag)', () => {
    it('should return recipe summaries without steps or ingredients', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // Verify projection: summary fields are present, heavy fields are omitted
      const first = res.body[0];
      expect(first).toHaveProperty('id', 'recipe-1');
      expect(first).toHaveProperty('title', 'カレーライス');
      expect(first).toHaveProperty('isFavorite', true);
      expect(first).toHaveProperty('notes');
      expect(first.steps).toBeUndefined();
      expect(first.ingredients).toBeUndefined();
    });

    it('should support ETag and 304 Not Modified', async () => {
      const firstRes = await request(app)
        .get('/api/recipes')
        .set('Authorization', 'Bearer valid-token');

      expect(firstRes.status).toBe(200);
      const etag = firstRes.headers.etag;
      expect(etag).toBeDefined();

      // Request with If-None-Match
      const secondRes = await request(app)
        .get('/api/recipes')
        .set('Authorization', 'Bearer valid-token')
        .set('If-None-Match', etag);

      expect(secondRes.status).toBe(304);
      expect(secondRes.text).toBe('');
    });
  });

  describe('GET /api/recipes/:recipeId (Full Detail)', () => {
    it('should return full recipe detail with steps and ingredients', async () => {
      const res = await request(app)
        .get('/api/recipes/recipe-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('recipe-1');
      expect(res.body.title).toBe('カレーライス');
      expect(res.body.ingredients).toEqual([{ name: '玉ねぎ', quantity: '2個' }]);
      expect(res.body.steps).toEqual([{ description: '炒める', imageUrls: [] }]);
    });

    it('should return 404 for non-existent recipe', async () => {
      const res = await request(app)
        .get('/api/recipes/non-existent-id')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  describe('CRUD Operations', () => {
    it('POST /api/recipes should create a new recipe', async () => {
      const newRecipeData = {
        title: 'オムライス',
        notes: 'たまごふわふわ',
        link: '',
        ingredients: [{ name: '卵', quantity: '3個' }],
        steps: [{ description: '包む', imageUrls: [] }],
        isFavorite: true,
      };

      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', 'Bearer valid-token')
        .send(newRecipeData);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('オムライス');
      expect(mockRecipes.length).toBe(3);
    });

    it('PUT /api/recipes/:recipeId should update existing recipe', async () => {
      const updateData = {
        title: '激辛カレーライス',
        isFavorite: false,
      };

      const res = await request(app)
        .put('/api/recipes/recipe-1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('激辛カレーライス');
      expect(res.body.isFavorite).toBe(false);
    });

    it('DELETE /api/recipes/:recipeId should remove the recipe', async () => {
      const res = await request(app)
        .delete('/api/recipes/recipe-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(204);
      expect(mockRecipes.find((r) => r.id === 'recipe-1')).toBeUndefined();
    });
  });
});
