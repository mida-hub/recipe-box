variable "project_id" {
  type        = string
  description = "The Google Cloud project ID."
  default     = "recipe-box-474414"
}

variable "region" {
  type        = string
  description = "The Google Cloud region to deploy resources in."
  default     = "asia-northeast1"
}

variable "custom_domain" {
  type        = string
  description = "The custom domain to map to the Cloud Run service."
  default     = ""
}

variable "image_tag" {
  type        = string
  description = "The image tag to deploy."
  default     = "bd14579"
}
