# ── IAM ──────────────────────────────────────────────────────────────────────

# Allow the github-actions-portfolio IAM user to deploy Lambda code
data "aws_iam_user" "github_actions" {
  user_name = "github-actions-portfolio"
}

resource "aws_iam_user_policy" "github_actions_lambda_deploy" {
  name = "lambda-deploy"
  user = data.aws_iam_user.github_actions.user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:UpdateFunctionCode", "lambda:GetFunction"]
      Resource = "arn:aws:lambda:us-east-1:*:function:rb-dev-*"
    }]
  })
}



resource "aws_iam_role" "api_lambda" {
  name = "rb-dev-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_s3_dealscout" {
  name = "s3-dealscout-read"
  role = aws_iam_role.api_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        "arn:aws:s3:::dealscout-data-dev",
        "arn:aws:s3:::dealscout-data-dev/*"
      ]
    }]
  })
}

# ── Lambda functions ──────────────────────────────────────────────────────────

resource "aws_lambda_function" "analyze_property" {
  filename         = "../api-dist/analyze-property.zip"
  function_name    = "rb-dev-analyze-property"
  role             = aws_iam_role.api_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512
  source_code_hash = filebase64sha256("../api-dist/analyze-property.zip")

  environment {
    variables = {
      ANTHROPIC_API_KEY   = var.anthropic_api_key
      HUD_API_KEY         = var.hud_api_key
      REDIS_URL           = var.redis_url
      DEALSCOUT_S3_BUCKET = "dealscout-data-dev"
    }
  }
}

resource "aws_lambda_function" "comps" {
  filename         = "../api-dist/comps.zip"
  function_name    = "rb-dev-comps"
  role             = aws_iam_role.api_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512
  source_code_hash = filebase64sha256("../api-dist/comps.zip")

  environment {
    variables = {
      DEALSCOUT_S3_BUCKET = "dealscout-data-dev"
    }
  }
}

resource "aws_lambda_function" "calls_remaining" {
  filename         = "../api-dist/calls-remaining.zip"
  function_name    = "rb-dev-calls-remaining"
  role             = aws_iam_role.api_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128
  source_code_hash = filebase64sha256("../api-dist/calls-remaining.zip")

  environment {
    variables = {
      REDIS_URL = var.redis_url
    }
  }
}

resource "aws_lambda_function" "fred_proxy" {
  filename         = "../api-dist/fred-proxy.zip"
  function_name    = "rb-dev-fred-proxy"
  role             = aws_iam_role.api_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128
  source_code_hash = filebase64sha256("../api-dist/fred-proxy.zip")

  environment {
    variables = {
      FRED_API_KEY = var.fred_api_key
    }
  }
}

resource "aws_lambda_function" "hud_proxy" {
  filename         = "../api-dist/hud-proxy.zip"
  function_name    = "rb-dev-hud-proxy"
  role             = aws_iam_role.api_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128
  source_code_hash = filebase64sha256("../api-dist/hud-proxy.zip")

  environment {
    variables = {
      HUD_API_KEY = var.hud_api_key
    }
  }
}

# ── API Gateway v2 (HTTP API) ─────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "api" {
  name          = "rb-dev-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://reecebernard.dev"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

# ── Integrations ──────────────────────────────────────────────────────────────

locals {
  lambdas = {
    analyze_property = aws_lambda_function.analyze_property
    comps            = aws_lambda_function.comps
    calls_remaining  = aws_lambda_function.calls_remaining
    fred_proxy       = aws_lambda_function.fred_proxy
    hud_proxy        = aws_lambda_function.hud_proxy
  }
}

resource "aws_apigatewayv2_integration" "analyze_property" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.analyze_property.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "comps" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.comps.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "calls_remaining" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.calls_remaining.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "fred_proxy" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.fred_proxy.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "hud_proxy" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.hud_proxy.invoke_arn
  payload_format_version = "2.0"
}

# ── Routes ────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "analyze_property" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /api/analyze-property"
  target    = "integrations/${aws_apigatewayv2_integration.analyze_property.id}"
}

resource "aws_apigatewayv2_route" "comps" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /api/comps"
  target    = "integrations/${aws_apigatewayv2_integration.comps.id}"
}

resource "aws_apigatewayv2_route" "calls_remaining" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /api/calls-remaining"
  target    = "integrations/${aws_apigatewayv2_integration.calls_remaining.id}"
}

resource "aws_apigatewayv2_route" "fred_proxy" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /api/fred-proxy"
  target    = "integrations/${aws_apigatewayv2_integration.fred_proxy.id}"
}

resource "aws_apigatewayv2_route" "hud_proxy" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /api/hud-proxy"
  target    = "integrations/${aws_apigatewayv2_integration.hud_proxy.id}"
}

# ── Lambda invoke permissions ─────────────────────────────────────────────────

resource "aws_lambda_permission" "analyze_property" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analyze_property.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "comps" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.comps.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "calls_remaining" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.calls_remaining.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "fred_proxy" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fred_proxy.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "hud_proxy" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.hud_proxy.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# ── Output ────────────────────────────────────────────────────────────────────

output "api_url" {
  description = "API Gateway base URL — set this as VITE_API_BASE_URL in your frontend build"
  value       = aws_apigatewayv2_stage.default.invoke_url
}
