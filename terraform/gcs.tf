resource "google_storage_bucket" "cloudbuild_source" {
  project      = var.project_id
  name         = "cloudbuild-source-recipe-box-474414" # Must be globally unique
  location     = "ASIA-NORTHEAST1"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7 # Delete source archives older than 7 days
    }
    action {
      type = "Delete"
    }
  }
}
