# NodeJS BitCoin Payment Service

A secure cryptocurrency payment service built with Node.js, TypeScript, and BTCPay Server integration. This service handles invoice creation, payment processing, and webhook notifications for crypto payments.

## Features

- 🔐 Secure BTCPay Server integration
- 🚀 TypeScript for type safety
- 🔄 Real-time webhook processing
- 🛡️ Signature verification for webhooks
- 🌐 CORS and security middleware
- 📊 Health check endpoint
- 🐳 Docker support for easy deployment

## Prerequisites

- Node.js 18+ or Docker
- BTCPay Server instance
- Environment variables configured

## Quick Start with Docker

### Production Deployment

1. **Clone and setup environment**:
   ```bash
   git clone <your-repo>
   cd NodeJS-Coin-Payment
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Check health**:
   ```bash
   curl http://localhost:8081/healthz
   ```

### Development with Docker

1. **Run development environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

This provides hot reloading for development.

## Manual Installation

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp env.example .env
   # Configure your .env file
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

### Production Build

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## Docker Commands

### Building Images

```bash
# Production image
docker build -t crypto-payments:latest .

# Development image
docker build -f Dockerfile.dev -t crypto-payments:dev .
```

### Running Containers

```bash
# Production
docker run -d \
  --name crypto-payments \
  -p 8081:8081 \
  --env-file .env \
  crypto-payments:latest

# Development
docker run -d \
  --name crypto-payments-dev \
  -p 8081:8081 \
  --env-file .env \
  -v $(pwd)/src:/app/src:ro \
  crypto-payments:dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BTCPAY_BASE_URL` | BTCPay Server URL | Yes |
| `BTCPAY_API_KEY` | BTCPay API key | Yes |
| `BTCPAY_STORE_ID` | BTCPay Store ID | Yes |
| `WEBHOOK_SECRET` | Webhook signature secret | Yes |
| `ALLOWED_ORIGIN` | CORS allowed origin | No |
| `DJANGO_CALLBACK_URL` | Django callback URL | Yes |
| `DJANGO_CALLBACK_TOKEN` | Django auth token | Yes |

## API Endpoints

### Health Check
```
GET /healthz
```
Returns server status.

### Create Invoice
```
POST /api/invoices
Content-Type: application/json

{
  "order_id": "string",
  "amount": "number|string",
  "currency": "string",
  "description": "string (optional)"
}
```

### Get Invoice Status
```
GET /api/invoices/:id
```

### Webhook Endpoint
```
POST /api/webhooks/btcpay
```
Receives BTCPay Server webhooks with signature verification.

## Security Features

- 🔐 Webhook signature verification
- 🛡️ Helmet.js security headers
- 🌐 CORS protection
- 👤 Non-root user in Docker
- 🔍 Input validation with Zod

## Monitoring

The service includes:
- Health check endpoint at `/healthz`
- Docker health checks
- Structured error logging
- Request/response logging

## Production Considerations

1. **Use HTTPS** in production
2. **Set up proper logging** (consider mounting `/app/logs`)
3. **Configure monitoring** and alerting
4. **Use Redis** for better state management in scaled deployments
5. **Set up backup** for critical data
6. **Configure firewall** rules

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   docker-compose down
   # Or change PORT in .env
   ```

2. **Environment variables not loaded**:
   ```bash
   # Ensure .env file exists and is properly formatted
   cat .env
   ```

3. **BTCPay connection issues**:
   ```bash
   # Check BTCPay Server URL and API key
   curl -H "Authorization: token YOUR_API_KEY" \
        https://your-btcpay-server.com/api/v1/stores
   ```

### Logs

```bash
# Docker logs
docker-compose logs -f crypto-payments

# Development logs
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Test with Docker
5. Submit a pull request

## License

[Your License Here]
