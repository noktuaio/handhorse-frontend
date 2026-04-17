output "aws_region" {
  description = "Região do bucket — usar como AWS_REGION no script deploy:static"
  value       = var.aws_region
}

output "s3_bucket_name" {
  description = "Nome do bucket para AWS_S3_BUCKET"
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "ID para CLOUDFRONT_DISTRIBUTION_ID (invalidação de cache)"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "Hostname *.cloudfront.net (sem domínio custom)"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "URL HTTPS do site"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}
