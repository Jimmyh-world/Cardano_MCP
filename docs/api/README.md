# Cardano MCP Server API Documentation

## Overview

The Cardano MCP Server provides a RESTful API for language models to access Cardano blockchain information, development tools, and contextual knowledge. This document details the available endpoints, request/response formats, and usage examples.

## Base URL

```
https://api.cardano-mcp.io/v1
```

## Authentication

All API requests require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

- Default: 100 requests per minute
- Burst: 200 requests per minute
- Custom limits available for enterprise users

## Endpoints

### 1. Tools API

#### List Available Tools

```http
GET /tools
```

Response:

```json
{
  "tools": [
    {
      "name": "validateAddress",
      "description": "Validates a Cardano address",
      "category": "address",
      "version": "1.0.0",
      "parameters": {
        "address": {
          "type": "string",
          "description": "Cardano address to validate",
          "required": true
        }
      }
    }
  ]
}
```

#### Execute Tool

```http
POST /tools/{toolName}
```

Request:

```json
{
  "parameters": {
    "param1": "value1"
  },
  "context": {
    "currentTask": "description"
  }
}
```

Response:

```json
{
  "result": {
    "success": true,
    "data": {}
  },
  "metadata": {
    "executionTime": "120ms",
    "toolVersion": "1.0.0"
  }
}
```

### 2. Context API

#### Get Context

```http
POST /context
```

Request:

```json
{
  "query": "How do I implement wallet connection?",
  "preferences": {
    "frameworks": ["react"],
    "detail": "high"
  }
}
```

Response:

```json
{
  "context": [
    {
      "title": "Wallet Connection Guide",
      "content": "...",
      "source": "docs.cardano.org",
      "relevance": 0.95
    }
  ],
  "suggestedTools": ["generateWalletConnector"]
}
```

### 3. Query API

#### Execute Query

```http
POST /query
```

Request:

```json
{
  "query": "Generate a wallet connection component",
  "context": {
    "framework": "react",
    "previousContext": {}
  },
  "preferences": {
    "detail": "high",
    "includeExamples": true
  }
}
```

Response:

```json
{
  "response": {
    "context": [],
    "toolResults": [],
    "suggestions": [],
    "codeExamples": []
  },
  "metadata": {
    "processingTime": "150ms",
    "sources": []
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "requestId": "unique-id"
  }
}
```

### Common Error Codes

| Code | Description           |
| ---- | --------------------- |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 429  | Too Many Requests     |
| 500  | Internal Server Error |

## Versioning

The API is versioned through the URL path. Current versions:

- V1: `/v1` - Current stable version
- Beta: `/beta` - Preview of upcoming features

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.cardano-mcp.io/v1/ws');
```

### Subscribe to Updates

```json
{
  "type": "subscribe",
  "channels": ["toolUpdates", "contextUpdates"]
}
```

### Real-time Tool Execution

```json
{
  "type": "executeTool",
  "tool": "validateAddress",
  "parameters": {}
}
```

## Examples

### Tool Execution Example

```javascript
// Execute a Plutus script validation
const response = await fetch('https://api.cardano-mcp.io/v1/tools/validatePlutusScript', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    parameters: {
      script: '...',
      network: 'mainnet',
    },
  }),
});

const result = await response.json();
```

### Context Query Example

```javascript
// Get context for wallet implementation
const response = await fetch('https://api.cardano-mcp.io/v1/context', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'How do I implement wallet connection?',
    preferences: {
      frameworks: ['react'],
      detail: 'high',
    },
  }),
});

const context = await response.json();
```

## SDK Support

Official SDKs are available for:

- JavaScript/TypeScript
- Python
- Rust
- Go

## Best Practices

1. **Rate Limiting**

   - Implement exponential backoff
   - Cache responses when possible
   - Use batch operations for multiple requests

2. **Error Handling**

   - Always check error responses
   - Implement proper retry logic
   - Log failed requests for debugging

3. **Security**
   - Store API keys securely
   - Validate all inputs
   - Use HTTPS for all requests

## Support

- Documentation: docs.cardano-mcp.io
- Issues: github.com/cardano-mcp/server/issues
- Email: support@cardano-mcp.io
