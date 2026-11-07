package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"firebase.google.com/go/v4/auth"
)

// Mock Auth
type mockAuthVerifier struct {
	verifyFunc func(ctx context.Context, idToken string) (*auth.Token, error)
}

func (m *mockAuthVerifier) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	if m.verifyFunc != nil {
		return m.verifyFunc(ctx, idToken)
	}
	if idToken == "valid-token" {
		return &auth.Token{UID: "test-user-123"}, nil
	}
	return nil, errors.New("invalid token")
}

// Mock RecipeStore (In-memory)
type mockRecipeStore struct {
	mu      sync.Mutex
	recipes []Recipe
}

func newMockRecipeStore() *mockRecipeStore {
	return &mockRecipeStore{
		recipes: []Recipe{
			{
				ID:          "recipe-1",
				Title:       "カレーライス",
				IsFavorite:  true,
				Notes:       "辛口がおすすめ",
				Link:        "https://example.com/curry",
				Ingredients: []Ingredient{{Name: "玉ねぎ", Quantity: "2個"}},
				Steps:       []Step{{Description: "炒める", ImageURLs: []string{}}},
				UserID:      "test-user-123",
			},
			{
				ID:          "recipe-2",
				Title:       "肉じゃが",
				IsFavorite:  false,
				Notes:       "落とし蓋をする",
				Link:        "",
				Ingredients: []Ingredient{{Name: "じゃがいも", Quantity: "3個"}},
				Steps:       []Step{{Description: "煮込む", ImageURLs: []string{}}},
				UserID:      "test-user-123",
			},
		},
	}
}

func (m *mockRecipeStore) ListSummaries(ctx context.Context, uid string) ([]RecipeSummary, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	summaries := make([]RecipeSummary, 0, len(m.recipes))
	for _, r := range m.recipes {
		summaries = append(summaries, RecipeSummary{
			ID:         r.ID,
			Title:      r.Title,
			IsFavorite: r.IsFavorite,
			Notes:      r.Notes,
			Link:       r.Link,
			UserID:     r.UserID,
		})
	}
	return summaries, nil
}

func (m *mockRecipeStore) GetRecipe(ctx context.Context, recipeID string) (*Recipe, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, r := range m.recipes {
		if r.ID == recipeID {
			copied := r
			return &copied, nil
		}
	}
	return nil, os.ErrNotExist
}

func (m *mockRecipeStore) CreateRecipe(ctx context.Context, recipe Recipe) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := fmt.Sprintf("recipe-%d", len(m.recipes)+1)
	recipe.ID = id
	m.recipes = append(m.recipes, recipe)
	return id, nil
}

func (m *mockRecipeStore) UpdateRecipe(ctx context.Context, recipeID string, updates map[string]interface{}) (map[string]interface{}, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, r := range m.recipes {
		if r.ID == recipeID {
			if title, ok := updates["title"].(string); ok {
				m.recipes[i].Title = title
			}
			if isFav, ok := updates["isFavorite"].(bool); ok {
				m.recipes[i].IsFavorite = isFav
			}
			result := map[string]interface{}{
				"id":         recipeID,
				"title":      m.recipes[i].Title,
				"isFavorite": m.recipes[i].IsFavorite,
			}
			return result, nil
		}
	}
	return nil, os.ErrNotExist
}

func (m *mockRecipeStore) DeleteRecipe(ctx context.Context, recipeID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, r := range m.recipes {
		if r.ID == recipeID {
			m.recipes = append(m.recipes[:i], m.recipes[i+1:]...)
			return nil
		}
	}
	return os.ErrNotExist
}

// Mock ImageUploader
type mockImageUploader struct{}

func (m *mockImageUploader) UploadImage(ctx context.Context, uid, filename, contentType string, data io.Reader) (string, error) {
	return fmt.Sprintf("https://storage.googleapis.com/test-bucket/recipe_images/%s/%s", uid, filename), nil
}

func setupTestApp() (*App, http.Handler) {
	app := &App{
		authVerifier:  &mockAuthVerifier{},
		recipeStore:   newMockRecipeStore(),
		imageUploader: &mockImageUploader{},
	}
	return app, app.routes()
}

func TestAuthMiddleware(t *testing.T) {
	_, router := setupTestApp()

	t.Run("should return 403 when Authorization header is missing", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("should return 403 when token is invalid", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("should pass when token is valid", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
	})
}

func TestGetRecipes_SummaryAndETag(t *testing.T) {
	_, router := setupTestApp()

	t.Run("should return recipe summaries without steps or ingredients", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var summaries []RecipeSummary
		if err := json.NewDecoder(rec.Body).Decode(&summaries); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if len(summaries) != 2 {
			t.Errorf("expected 2 summaries, got %d", len(summaries))
		}
		if summaries[0].Title != "カレーライス" {
			t.Errorf("expected title 'カレーライス', got '%s'", summaries[0].Title)
		}
	})

	t.Run("should support ETag and 304 Not Modified", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		etag := rec.Header().Get("ETag")
		if etag == "" {
			t.Fatal("expected ETag header to be set")
		}

		// Second request with If-None-Match
		req2 := httptest.NewRequest("GET", "/api/recipes", nil)
		req2.Header.Set("Authorization", "Bearer valid-token")
		req2.Header.Set("If-None-Match", etag)
		rec2 := httptest.NewRecorder()
		router.ServeHTTP(rec2, req2)

		if rec2.Code != http.StatusNotModified {
			t.Errorf("expected 304 Not Modified, got %d", rec2.Code)
		}
	})
}

func TestGetRecipe_Detail(t *testing.T) {
	_, router := setupTestApp()

	t.Run("should return full recipe detail with steps and ingredients", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes/recipe-1", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var recipe Recipe
		if err := json.NewDecoder(rec.Body).Decode(&recipe); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if recipe.ID != "recipe-1" {
			t.Errorf("expected ID 'recipe-1', got '%s'", recipe.ID)
		}
		if len(recipe.Ingredients) != 1 || recipe.Ingredients[0].Name != "玉ねぎ" {
			t.Errorf("unexpected ingredients: %+v", recipe.Ingredients)
		}
		if len(recipe.Steps) != 1 || recipe.Steps[0].Description != "炒める" {
			t.Errorf("unexpected steps: %+v", recipe.Steps)
		}
	})

	t.Run("should return 404 for non-existent recipe", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/recipes/non-existent-id", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", rec.Code)
		}
	})
}

func TestCRUDOperations(t *testing.T) {
	_, router := setupTestApp()

	t.Run("POST /api/recipes should create a new recipe", func(t *testing.T) {
		newRecipe := Recipe{
			Title:       "オムライス",
			Notes:       "たまごふわふわ",
			Link:        "",
			Ingredients: []Ingredient{{Name: "卵", Quantity: "3個"}},
			Steps:       []Step{{Description: "包む", ImageURLs: []string{}}},
			IsFavorite:  true,
		}
		payload, _ := json.Marshal(newRecipe)

		req := httptest.NewRequest("POST", "/api/recipes", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer valid-token")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d", rec.Code)
		}

		var created Recipe
		if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
			t.Fatalf("failed to decode created recipe: %v", err)
		}
		if created.ID == "" || created.Title != "オムライス" {
			t.Errorf("unexpected created recipe: %+v", created)
		}
	})

	t.Run("PUT /api/recipes/:recipeId should update existing recipe", func(t *testing.T) {
		updates := map[string]interface{}{
			"title":      "激辛カレーライス",
			"isFavorite": false,
		}
		payload, _ := json.Marshal(updates)

		req := httptest.NewRequest("PUT", "/api/recipes/recipe-1", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer valid-token")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var res map[string]interface{}
		if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode update response: %v", err)
		}
		if res["title"] != "激辛カレーライス" || res["isFavorite"] != false {
			t.Errorf("unexpected update response: %+v", res)
		}
	})

	t.Run("DELETE /api/recipes/:recipeId should remove the recipe", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/recipes/recipe-1", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", rec.Code)
		}

		// Verify deletion
		getReq := httptest.NewRequest("GET", "/api/recipes/recipe-1", nil)
		getReq.Header.Set("Authorization", "Bearer valid-token")
		getRec := httptest.NewRecorder()
		router.ServeHTTP(getRec, getReq)

		if getRec.Code != http.StatusNotFound {
			t.Errorf("expected 404 after deletion, got %d", getRec.Code)
		}
	})
}

func TestImageUpload(t *testing.T) {
	_, router := setupTestApp()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "sample.png")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	part.Write([]byte("fake image data"))
	writer.Close()

	req := httptest.NewRequest("POST", "/api/images/upload", body)
	req.Header.Set("Authorization", "Bearer valid-token")
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var res map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !strings.Contains(res["imageUrl"], "sample.png") {
		t.Errorf("expected imageUrl to contain sample.png, got %s", res["imageUrl"])
	}
}
