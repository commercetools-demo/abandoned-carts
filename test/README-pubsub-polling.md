# Google Cloud Pub/Sub Polling Script

This script polls for messages from the Google Cloud Pub/Sub topic `projects/ct-sales-207211/topics/cb-custom-object`.

## Prerequisites

1. **Google Cloud Authentication**: You need to be authenticated with Google Cloud. You can do this by:
   - Running `gcloud auth application-default login`
   - Or setting the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a service account key file

2. **Dependencies**: Install the required packages:
   ```bash
   npm install
   ```

## Usage

### Run the polling script:
```bash
npm run test:pubsub-polling
```

### Or run directly with ts-node:
```bash
npx ts-node tests/pubsub-polling.ts
```

## What the script does

1. **Creates a subscription** if it doesn't exist (`cb-custom-object-subscription`)
2. **Polls for messages** from the topic
3. **Displays message details** including:
   - Message ID
   - Raw data
   - Attributes
   - Publish time
   - Parsed JSON data (if applicable)
4. **Acknowledges messages** automatically
5. **Handles graceful shutdown** with Ctrl+C

## Configuration

The script uses these default settings:
- **Project ID**: `ct-sales-207211`
- **Topic**: `cb-custom-object`
- **Subscription**: `cb-custom-object-subscription`
- **Ack Deadline**: 60 seconds
- **Message Retention**: 10 minutes

## Environment Variables

You can override the default project ID by setting:
```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
```

## Stopping the script

Press `Ctrl+C` to stop the script gracefully. It will:
- Close the subscription
- Acknowledge any pending messages
- Exit cleanly

## Troubleshooting

### Authentication Issues
If you get authentication errors:
```bash
gcloud auth application-default login
```

### Permission Issues
Make sure your Google Cloud account has the following roles:
- `Pub/Sub Subscriber`
- `Pub/Sub Editor` (to create subscriptions)

### Network Issues
If you're behind a corporate firewall, you may need to configure proxy settings or use a VPN.
