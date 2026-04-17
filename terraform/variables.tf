variable "aws_region" {
  description = "Região do bucket S3 (deve coincidir com AWS_REGION no deploy:static)."
  type        = string
  default     = "us-east-2"
}

variable "aws_profile" {
  description = "Perfil AWS CLI (ficheiro ~/.aws/credentials)."
  type        = string
  default     = "default"
}

variable "bucket_name" {
  description = "Nome global do bucket. null = handhorse-frontend-static-<account_id>."
  type        = string
  default     = null
  nullable    = true
}

variable "cloudfront_price_class" {
  description = "PriceClass_100 | PriceClass_200 | PriceClass_All"
  type        = string
  default     = "PriceClass_100"
}

variable "domain_name" {
  description = "Domínio HTTPS opcional (ex.: app.exemplo.com). Vazio = só *.cloudfront.net."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN do certificado ACM em us-east-1 (obrigatório se domain_name != \"\" — regra da AWS para CloudFront)."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Hosted zone Route53 (ex.: Z0123456). Vazio = não cria registo DNS."
  type        = string
  default     = ""
}

variable "create_route53_alias" {
  description = "Se true e route53_zone_id + domain_name preenchidos, cria A/ALIAS para o CloudFront."
  type        = bool
  default     = false
}

check "acm_when_domain" {
  assert {
    condition     = var.domain_name == "" || var.acm_certificate_arn != ""
    error_message = "Com domain_name definido, preencha acm_certificate_arn (certificado ACM na região us-east-1)."
  }
}
