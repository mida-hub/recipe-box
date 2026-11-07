package main

import (
	"context"
	"io"

	"firebase.google.com/go/v4/auth"
)

// AuthVerifier allows mocking ID token verification in tests
type AuthVerifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error)
}

// RecipeStore abstracts Firestore operations for testing
type RecipeStore interface {
	ListSummaries(ctx context.Context, uid string) ([]RecipeSummary, error)
	GetRecipe(ctx context.Context, recipeID string) (*Recipe, error)
	CreateRecipe(ctx context.Context, recipe Recipe) (string, error)
	UpdateRecipe(ctx context.Context, recipeID string, updates map[string]interface{}) (map[string]interface{}, error)
	DeleteRecipe(ctx context.Context, recipeID string) error
}

// ImageUploader abstracts image storage upload for testing
type ImageUploader interface {
	UploadImage(ctx context.Context, uid, filename, contentType string, data io.Reader) (string, error)
}
