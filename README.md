# Abandoned Carts Application

A CommerceTools Custom Application for managing abandoned carts with a standalone service for processing abandoned cart data.

## Project Structure

```
abandoned-carts/
├── mc-app/                    # Merchant Center Custom Application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── carts/         # Carts management
│   │   │   ├── configuration/ # App configuration
│   │   │   └── service-administration/ # Service admin
│   │   ├── hooks/             # Custom React hooks
│   │   ├── service/           # Service integration
│   │   └── i18n/              # Internationalization
│   └── public/                # Built application files
└── service/                   # Standalone Node.js/TypeScript service
    ├── src/
    │   ├── controllers/       # HTTP controllers
    │   ├── services/          # Business logic
    │   ├── routes/            # API routes
    │   ├── client/            # CommerceTools SDK client
    │   └── tests/             # Unit tests
    └── build/                 # Compiled TypeScript
```

## Features

### Merchant Center Application
- **Carts Management**: View and manage abandoned carts
- **Configuration**: Configure abandoned cart settings
- **Service Administration**: Manage the abandoned cart service
- **Multi-language Support**: Internationalization for multiple languages

### Standalone Service
- **Abandoned Cart Processing**: Automated processing of abandoned carts
- **Custom Object Creation**: Creates custom objects for abandoned carts
- **Configurable Rules**: Configurable abandonment timeframes
- **RESTful API**: HTTP endpoints for cart processing
- **Comprehensive Logging**: Detailed logging for monitoring

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- CommerceTools project with appropriate permissions
- Environment variables configured

## Environment Variables

Create a `.env` file in the `service/` directory with the following variables:

```env
CTP_CLIENT_ID=your_client_id
CTP_CLIENT_SECRET=your_client_secret
CTP_PROJECT_KEY=your_project_key
CTP_SCOPE=your_scope
CTP_REGION=your_region
```

## Installation

### Merchant Center Application

```bash
cd mc-app
npm install
```

### Standalone Service

```bash
cd service
npm install
```

## Development

### Running the MC App

```bash
cd mc-app
npm start
```

The application will be available at the configured Merchant Center URL.

### Running the Service

```bash
cd service
npm run start:dev
```

The service will be available at `http://localhost:3000`

## API Endpoints

### Abandoned Cart Service

#### Process Abandoned Carts
- **POST** `/abandoned-cart/process`
- **Description**: Processes abandoned carts and creates custom objects
- **Response**: JSON with processing results

Example response:
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

## Configuration

The abandoned cart service reads configuration from a CommerceTools custom object:

- **Container**: `abandoned-cart`
- **Key**: `configuration`
- **Value**: JSON object with:
  - `abandonAfterHours`: Hours after which a cart is considered abandoned (default: 24)
  - `ignoreCartsOlderThan`: Days after which carts are ignored (default: 30)

Example configuration:
```json
{
  "abandonAfterHours": "24",
  "ignoreCartsOlderThan": "30"
}
```

## Custom Object Structure

For each abandoned cart, a custom object is created with:
- **Container**: `abandoned-carts`
- **Key**: Cart ID
- **Value**: JSON object containing:
  - `customerEmail`: Customer's email address
  - `cartTotal`: Cart total amount
  - `cartId`: Cart ID
  - `abandonmentDate`: Date when cart was last modified
  - `currencyCode`: Currency code

## Testing

### MC App Tests
```bash
cd mc-app
npm test
```

### Service Tests
```bash
cd service
npm test
```

## Building for Production

### MC App
```bash
cd mc-app
npm run build
```

### Service
```bash
cd service
npm run build
```

## Deployment

### Merchant Center Application
Deploy the built application to your CommerceTools project using the Merchant Center Custom Applications feature.

### Standalone Service
Deploy the service to your preferred hosting platform (e.g., Google Cloud Platform, AWS, Heroku).

## Usage

1. **Configure the Service**: Set up the configuration custom object in CommerceTools
2. **Deploy the MC App**: Deploy the custom application to your Merchant Center
3. **Process Carts**: Use the service endpoint to process abandoned carts
4. **Monitor Results**: View processing results in the MC App or service logs

## Development Notes

- The service uses the CommerceTools SDK for API interactions
- All API calls are properly logged for debugging
- The service handles errors gracefully and continues processing
- Configuration is cached and can be updated without service restart

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository or contact the development team.
