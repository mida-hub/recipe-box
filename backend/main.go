package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/google/uuid"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Ingredient struct {
	Name     string `json:"name" firestore:"name"`
	Quantity string `json:"quantity" firestore:"quantity"`
}

type Step struct {
	Description string   `json:"description" firestore:"description"`
	ImageURLs   []string `json:"imageUrls" firestore:"imageUrls"`
}

// Recipe represents a recipe document in Firestore.
type Recipe struct {
	ID          string       `json:"id,omitempty" firestore:"-"`
	Title       string       `json:"title" firestore:"title"`
	IsFavorite  bool         `json:"isFavorite" firestore:"isFavorite"`
	Notes       string       `json:"notes" firestore:"notes"`
	Link        string       `json:"link" firestore:"link"`
	Ingredients []Ingredient `json:"ingredients" firestore:"ingredients"`
	Steps       []Step       `json:"steps" firestore:"steps"`
	UserID      string       `json:"userId" firestore:"userId"`
}

// RecipeSummary is used for the list endpoint (GET /recipes)
type RecipeSummary struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	IsFavorite bool   `json:"isFavorite"`
	Notes      string `json:"notes"`
	Link       string `json:"link"`
	UserID     string `json:"userId"`
}

type App struct {
	firestoreClient *firestore.Client
	authClient      *auth.Client
	storageBucket   *storage.BucketHandle
	bucketName      string
}

type contextKey string

const userContextKey contextKey = "user"

func main() {
	ctx := context.Background()

	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "recipe-box-474414"
		log.Printf("GOOGLE_CLOUD_PROJECT not set, defaulting to %s", projectID)
	}

	bucketName := os.Getenv("STORAGE_BUCKET_NAME")
	if bucketName == "" {
		bucketName = "recipe-box-474414.firebasestorage.app"
	}

	fbConfig := &firebase.Config{
		ProjectID:     projectID,
		StorageBucket: bucketName,
	}

	fbApp, err := firebase.NewApp(ctx, fbConfig)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase App: %v", err)
	}

	authClient, err := fbApp.Auth(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase Auth: %v", err)
	}

	firestoreClient, err := fbApp.Firestore(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize Firestore: %v", err)
	}
	defer firestoreClient.Close()

	storageClient, err := fbApp.Storage(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize Storage: %v", err)
	}
	bucketHandle, err := storageClient.Bucket(bucketName)
	if err != nil {
		log.Fatalf("Failed to get bucket %s: %v", bucketName, err)
	}

	app := &App{
		firestoreClient: firestoreClient,
		authClient:      authClient,
		storageBucket:   bucketHandle,
		bucketName:      bucketName,
	}

	r := app.routes()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Server listening on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}

func (a *App) routes() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS configuration matching backend/index.js
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"https://recipe-box-474414.web.app",
			"https://recipe-box-474414.firebaseapp.com",
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:5173",
			"https://recipe-box-backend-rprludoc2q-an.a.run.app",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "If-None-Match"},
		ExposedHeaders:   []string{"ETag"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte("Hello from the backend!"))
	})

	r.Route("/api", func(api chi.Router) {
		api.Group(func(protected chi.Router) {
			protected.Use(a.authMiddleware)

			protected.Get("/recipes", a.handleGetRecipes)
			protected.Post("/recipes", a.handleCreateRecipe)
			protected.Get("/recipes/{recipeId}", a.handleGetRecipe)
			protected.Put("/recipes/{recipeId}", a.handleUpdateRecipe)
			protected.Delete("/recipes/{recipeId}", a.handleDeleteRecipe)

			protected.Post("/images/upload", a.handleUploadImage)
		})
	})

	return r
}

func (a *App) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Unauthorized", http.StatusForbidden)
			return
		}

		idToken := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := a.authClient.VerifyIDToken(r.Context(), idToken)
		if err != nil {
			log.Printf("Error verifying ID token: %v", err)
			http.Error(w, "Unauthorized", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getUserFromContext(ctx context.Context) *auth.Token {
	if token, ok := ctx.Value(userContextKey).(*auth.Token); ok {
		return token
	}
	return nil
}

// GET /api/recipes
func (a *App) handleGetRecipes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := getUserFromContext(ctx)

	// In Express: recipesCollection.select('title', 'isFavorite', 'notes', 'link', 'userId').get()
	iter := a.firestoreClient.Collection("recipes").
		Select("title", "isFavorite", "notes", "link", "userId").
		Documents(ctx)
	defer iter.Stop()

	summaries := make([]RecipeSummary, 0)
	for {
		doc, err := iter.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			log.Printf("Error getting recipes for user %s: %v", user.UID, err)
			http.Error(w, "Error getting recipes", http.StatusInternalServerError)
			return
		}

		data := doc.Data()
		summary := RecipeSummary{
			ID: doc.Ref.ID,
		}
		if title, ok := data["title"].(string); ok {
			summary.Title = title
		}
		if isFav, ok := data["isFavorite"].(bool); ok {
			summary.IsFavorite = isFav
		}
		if notes, ok := data["notes"].(string); ok {
			summary.Notes = notes
		}
		if link, ok := data["link"].(string); ok {
			summary.Link = link
		}
		if uid, ok := data["userId"].(string); ok {
			summary.UserID = uid
		}
		summaries = append(summaries, summary)
	}

	body, err := json.Marshal(summaries)
	if err != nil {
		http.Error(w, "Error encoding recipes", http.StatusInternalServerError)
		return
	}

	// Calculate ETag (W/"<sha256-hex>")
	hash := sha256.Sum256(body)
	etag := fmt.Sprintf(`W/"%s"`, hex.EncodeToString(hash[:]))

	w.Header().Set("ETag", etag)
	w.Header().Set("Content-Type", "application/json")

	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

// GET /api/recipes/{recipeId}
func (a *App) handleGetRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := getUserFromContext(ctx)
	recipeID := chi.URLParam(r, "recipeId")

	doc, err := a.firestoreClient.Collection("recipes").Doc(recipeID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			http.Error(w, "Recipe not found", http.StatusNotFound)
			return
		}
		log.Printf("Error getting recipe %s for user %s: %v", recipeID, user.UID, err)
		http.Error(w, fmt.Sprintf("Error getting recipe %s", recipeID), http.StatusInternalServerError)
		return
	}

	var recipe Recipe
	if err := doc.DataTo(&recipe); err != nil {
		log.Printf("Error mapping recipe %s: %v", recipeID, err)
		http.Error(w, "Error reading recipe data", http.StatusInternalServerError)
		return
	}
	recipe.ID = doc.Ref.ID

	if recipe.Ingredients == nil {
		recipe.Ingredients = []Ingredient{}
	}
	if recipe.Steps == nil {
		recipe.Steps = []Step{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(recipe)
}

// POST /api/recipes
func (a *App) handleCreateRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := getUserFromContext(ctx)

	var reqBody Recipe
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if reqBody.Ingredients == nil {
		reqBody.Ingredients = []Ingredient{}
	}
	if reqBody.Steps == nil {
		reqBody.Steps = []Step{}
	}
	reqBody.UserID = user.UID

	docRef, _, err := a.firestoreClient.Collection("recipes").Add(ctx, reqBody)
	if err != nil {
		log.Printf("Error creating recipe for user %s: %v", user.UID, err)
		http.Error(w, "Error creating recipe", http.StatusInternalServerError)
		return
	}

	reqBody.ID = docRef.ID
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(reqBody)
}

// PUT /api/recipes/{recipeId}
func (a *App) handleUpdateRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := getUserFromContext(ctx)
	recipeID := chi.URLParam(r, "recipeId")

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	docRef := a.firestoreClient.Collection("recipes").Doc(recipeID)
	doc, err := docRef.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			http.Error(w, "Recipe not found", http.StatusNotFound)
			return
		}
		log.Printf("Error updating recipe %s for user %s: %v", recipeID, user.UID, err)
		http.Error(w, fmt.Sprintf("Error updating recipe %s", recipeID), http.StatusInternalServerError)
		return
	}

	// Prepare firestore updates
	var fsUpdates []firestore.Update
	for k, v := range updates {
		if k == "id" {
			continue
		}
		fsUpdates = append(fsUpdates, firestore.Update{
			Path:  k,
			Value: v,
		})
	}

	if len(fsUpdates) > 0 {
		if _, err := docRef.Update(ctx, fsUpdates); err != nil {
			log.Printf("Error applying update to recipe %s: %v", recipeID, err)
			http.Error(w, fmt.Sprintf("Error updating recipe %s", recipeID), http.StatusInternalServerError)
			return
		}
	}

	// Merge existing data with updates to return complete object
	existingData := doc.Data()
	for k, v := range updates {
		existingData[k] = v
	}
	existingData["id"] = recipeID

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existingData)
}

// DELETE /api/recipes/{recipeId}
func (a *App) handleDeleteRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := getUserFromContext(ctx)
	recipeID := chi.URLParam(r, "recipeId")

	docRef := a.firestoreClient.Collection("recipes").Doc(recipeID)
	doc, err := docRef.Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			http.Error(w, "Recipe not found", http.StatusNotFound)
			return
		}
		log.Printf("Error deleting recipe %s for user %s: %v", recipeID, user.UID, err)
		http.Error(w, fmt.Sprintf("Error deleting recipe %s", recipeID), http.StatusInternalServerError)
		return
	}

	if _, err := docRef.Delete(ctx); err != nil {
		log.Printf("Error deleting recipe %s for user %s: %v", recipeID, user.UID, err)
		http.Error(w, fmt.Sprintf("Error deleting recipe %s", recipeID), http.StatusInternalServerError)
		return
	}

	_ = doc
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/images/upload
func (a *App) handleUploadImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := getUserFromContext(ctx)

	// 5MB limit matching Multer
	if err := r.ParseMultipartForm(5 * 1024 * 1024); err != nil {
		http.Error(w, "File exceeds limit or invalid multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "No image file provided.", http.StatusBadRequest)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	objectName := fmt.Sprintf("recipe_images/%s/%s-%s", user.UID, uuid.New().String(), header.Filename)
	obj := a.storageBucket.Object(objectName)

	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType

	if _, err := io.Copy(writer, file); err != nil {
		log.Printf("Error uploading image to storage: %v", err)
		http.Error(w, "Error uploading image.", http.StatusInternalServerError)
		return
	}

	if err := writer.Close(); err != nil {
		log.Printf("Error closing storage writer: %v", err)
		http.Error(w, "Error uploading image.", http.StatusInternalServerError)
		return
	}

	// Make public equivalent
	if err := obj.ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
		log.Printf("Warning: Failed to set public ACL: %v", err)
	}

	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s", a.bucketName, objectName)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"imageUrl": publicURL,
	})
}
