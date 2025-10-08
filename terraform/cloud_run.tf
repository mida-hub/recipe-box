# Cloud Run service
resource "google_cloud_run_v2_service" "this" {
  project  = var.project_id
  name     = "recipe-box-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  invoker_iam_disabled = true

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 1 # Allow for some scaling
    }

    containers {
      name  = "recipe-box-backend-1"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/recipe-box-repo/recipe-box-backend:${var.image_tag}"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "recipe-box-474414"
      }

      resources {
        cpu_idle = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      ports {
        container_port = 3000 # Corrected port
        name           = "http1"
      }

      startup_probe {
        http_get {
          path = "/" # Corrected health check path
          port = 3000 # Corrected health check port
        }
        initial_delay_seconds = 2
        timeout_seconds       = 2
        period_seconds        = 3
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/" # Corrected health check path
          port = 3000 # Corrected health check port
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 5
      }
    }

    timeout               = "300s"
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}


# Custom domain mapping (optional)
resource "google_cloud_run_domain_mapping" "this" {
  count = var.custom_domain != "" ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = var.custom_domain

  spec {
    route_name = google_cloud_run_v2_service.this.name
  }
}

output "cloud_run_service_url" {
  description = "The URL of the Cloud Run service."
  value       = google_cloud_run_v2_service.this.uri
}
