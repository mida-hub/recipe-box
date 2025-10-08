terraform {
  required_version = ">= 1.12"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "=6.46.0"
    }
  }

  backend "gcs" {
    bucket = "tfstate-recipe-box-474414"
    prefix = "recipe-box/prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {}
