# Abandoned Cart Service

This service processes abandoned carts and creates custom objects for them in CommerceTools.

## Endpoint

**POST** `/abandoned-cart/process`

## Description

The abandoned cart service:
1. Fetches configuration from a custom object (`abandoned-cart` container, `configuration` key)
2. Queries all carts in batches
3. Identifies abandoned carts based on configuration criteria
4. Creates custom objects for each abandoned cart

## Configuration

The service reads configuration from a custom object with:
- Container: `abandoned-cart`
- Key: `configuration`
- Value: JSON object with:
  - `abandonAfterHours`: Number of hours after which a cart is considered abandoned (default: 24)
  - `ignoreCartsOlderThan`: Number of days after which carts are ignored (default: 30)

Example configuration:
```json
{
  "abandonAfterHours": "24",
  "ignoreCartsOlderThan": "30"
}
```

## Response

### Success Response (200)
```json
{
  "success": true,
  "totalProcessed": 150,
  "totalCreated": 45,
  "configuration": {
    "abandonAfterHours": 24,
    "ignoreCartsOlderThanDays": 30
  },
  "message": "Successfully processed 150 carts and created 45 abandoned cart records..."
}
```

### Error Response (500)
```json
{
  "success": false,
  "error": "Error message",
  "message": "Failed to process abandoned carts: Error message"
}
```

## Custom Object Structure

For each abandoned cart, a custom object is created with:
- Container: `abandoned-carts`
- Key: Cart ID
- Value: JSON object containing:
  - `customerEmail`: Customer's email address
  - `cartTotal`: Cart total amount
  - `cartId`: Cart ID
  - `abandonmentDate`: Date when cart was last modified
  - `currencyCode`: Currency code

## Usage

```bash
curl -X POST http://your-service-url/abandoned-cart/process
```

## Migration from MC App

This service replaces the abandoned cart functionality that was previously in the MC App (`mc-app/src/service/abandoned-cart-service.js`). The main differences:

1. **Standalone Service**: Now runs as a separate service accessible via HTTP
2. **CommerceTools SDK**: Uses the official CommerceTools SDK instead of Apollo Client
3. **Better Error Handling**: Improved error handling and logging
4. **Configuration Management**: Centralized configuration management
5. **RESTful API**: Standard REST endpoint instead of GraphQL mutations

## Environment Variables

The service requires the same CommerceTools environment variables as the main service:
- `CTP_CLIENT_ID`
- `CTP_CLIENT_SECRET`
- `CTP_PROJECT_KEY`
- `CTP_SCOPE`
- `CTP_REGION`
