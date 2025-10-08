# Test Scripts for Abandoned Carts Project

This directory contains standalone test scripts for the abandoned carts project.

## Setup

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Environment Variables:**
   Create a `.env` file with the following variables:
   ```bash
   # CommerceTools API Configuration
   CTP_CLIENT_ID=your_client_id_here
   CTP_CLIENT_SECRET=your_client_secret_here
   CTP_PROJECT_KEY=your_project_key_here
   CTP_SCOPE=manage_project:your-project-key
   CTP_REGION=europe-west1.gcp

   # Google Cloud Configuration (for Pub/Sub)
   GOOGLE_CLOUD_PROJECT=ct-sales-207211
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

   # Optional
   NODE_ENV=development
   ```

## Available Scripts

### Pub/Sub Polling
```bash
yarn pubsub-polling
```
- Polls messages from Google Cloud Pub/Sub topic `projects/ct-sales-207211/topics/cb-custom-object`
- Creates subscription automatically if needed
- Displays detailed message information
- Runs until Ctrl+C

### Custom Object Creation
```bash
yarn create-custom-object-standalone
```
- Creates a custom object in CommerceTools
- Container: `abandoned-carts`
- Key: `12345`
- Includes sample data with various data types

### Alternative Custom Object Script
```bash
yarn create-custom-object
```
- Uses the service's internal API client
- Requires service configuration validation

## Prerequisites

### For Pub/Sub Script:
- Google Cloud authentication: `gcloud auth application-default login`
- Or set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Required permissions: `Pub/Sub Subscriber`, `Pub/Sub Editor`

### For Custom Object Scripts:
- Valid CommerceTools API credentials
- Appropriate scopes for custom object management

## Project Structure

```
test/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── pubsub-polling.ts         # Google Cloud Pub/Sub polling script
├── create-custom-object.ts   # Custom object creation (service client)
├── create-custom-object-standalone.ts # Custom object creation (standalone)
├── README-pubsub-polling.md  # Detailed Pub/Sub documentation
└── integration/              # Integration tests
    └── routes.spec.ts
```
