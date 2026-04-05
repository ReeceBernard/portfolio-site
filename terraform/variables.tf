variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
}

variable "hud_api_key" {
  description = "HUD API key for Fair Market Rents"
  type        = string
  sensitive   = true
}

variable "fred_api_key" {
  description = "FRED API key for mortgage rates"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Redis connection URL for rate limiting"
  type        = string
  sensitive   = true
}
