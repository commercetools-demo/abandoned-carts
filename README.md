# Abandoned Carts Application

A comprehensive commercetools solution for managing abandoned carts with automated processing, email notifications, and order conversion tracking.

## Architecture Overview

The application consists of several interconnected modules that work together to provide a complete abandoned cart management solution:

### Core Modules

#### 1. **Merchant Center Application (mc-app)**
A custom application that provides the user interface for managing abandoned carts within the commercetools Merchant Center.

**Key Features:**
- View abandoned carts with real-time data from custom objects
- Configure abandonment rules and email templates
- Monitor service execution and processing statistics
- Manage service settings and run manual processing

**Interactions:**
- Reads configuration from commercetools custom objects
- Calls the abandoned cart service via HTTP API
- Displays processing results and service logs

#### 2. **Abandoned Cart Service (service)**
A Node.js/TypeScript microservice that processes abandoned carts and creates custom objects.

**Key Features:**
- Fetches active carts based on configurable timeframes
- Creates abandoned cart custom objects with customer data
- Updates cart custom fields to mark them as abandoned
- Provides comprehensive logging and error handling

**Interactions:**
- Reads configuration from commercetools custom objects
- Queries carts using commercetools SDK
- Creates and updates custom objects
- Logs processing statistics to service-log custom object

#### 3. **Mail Sender Service (mail-sender)**
A microservice that handles email notifications for abandoned carts.

**Key Features:**
- Processes Pub/Sub messages for new abandoned cart custom objects
- Fetches customer and cart details from commercetools
- Sends personalized emails using SendGrid
- Updates custom objects with email sent timestamps

**Interactions:**
- Receives messages directly from Google Cloud Pub/Sub
- Queries commercetools for customer and cart data
- Sends emails via SendGrid API
- Updates custom objects with email status

#### 4. **Order Created Event Handler (order-created-event)**
A microservice that processes order creation events and updates abandoned cart records.

**Key Features:**
- Receives order created messages via Pub/Sub
- Updates abandoned cart custom objects with conversion timestamps
- Tracks cart-to-order conversion rates

**Interactions:**
- Receives messages directly from Google Cloud Pub/Sub
- Queries commercetools for abandoned cart custom objects
- Updates custom objects with conversion data

#### 5. **Job Scheduler (job)**
A scheduled job that triggers the abandoned cart service at regular intervals.

**Key Features:**
- Runs on a configurable schedule (default: every 5 minutes)
- Calls the abandoned cart service via HTTP
- Provides centralized job management

**Interactions:**
- Calls abandoned cart service endpoint
- Logs job execution results

### Data Flow

```
1. Configuration Setup
   └── MC App → commercetools Custom Object (abandoned-cart/configuration)

2. Cart Processing
   └── Job Scheduler → Abandoned Cart Service → commercetools API
   └── Service → Custom Objects (abandoned-carts/{cartId})
   └── Service → Cart Custom Fields (abandoned: true)

3. Email Notification
   └── Pub/Sub → Mail Sender Service
   └── Mail Sender → commercetools API → SendGrid → Customer

4. Order Conversion
   └── Pub/Sub → Order Event Handler
   └── Order Event Handler → commercetools API → Custom Object Update

5. Monitoring
   └── MC App → Service Log Custom Object → Processing Statistics
```

### Key Data Structures

#### Configuration Custom Object
- **Container**: `abandoned-cart`
- **Key**: `configuration`
- **Purpose**: Stores abandonment rules and email templates

#### Abandoned Cart Custom Objects
- **Container**: `abandoned-carts`
- **Key**: Cart ID
- **Purpose**: Stores abandoned cart data and tracking information

#### Service Log Custom Object
- **Container**: `abandoned-cart`
- **Key**: `service-log`
- **Purpose**: Tracks processing statistics and execution history

### Integration Points

#### Google Cloud Pub/Sub
- **Topics**: Auto-generated topic names for abandoned cart notifications and order creation events
- **Purpose**: Direct event-driven communication to microservices
- **Note**: Topic names shown in testing scripts are for development/testing purposes only

#### commercetools API
- **Custom Objects**: Configuration, abandoned carts, service logs
- **Carts API**: Querying and updating cart data
- **Custom Fields**: Marking carts as abandoned

#### SendGrid API
- **Purpose**: Sending transactional emails
- **Integration**: SMTP-based email delivery

### Scalability & Reliability

- **Microservices Architecture**: Each service can be scaled independently
- **Event-Driven Design**: Direct Pub/Sub messaging for real-time processing
- **Error Handling**: Comprehensive error handling and logging
- **Configuration Management**: Centralized configuration via custom objects
- **Monitoring**: Built-in service logging and statistics

### Development & Testing

The project includes comprehensive testing infrastructure:
- **Test Scripts**: Custom object management, order creation, and service testing
- **Mock Services**: Local development and testing capabilities
- **Interactive Tools**: Scripts for managing test data and scenarios
- **Pub/Sub Testing**: Tools for testing event-driven workflows with predefined topic names

This architecture provides a robust, scalable solution for abandoned cart management with real-time processing, email notifications, and conversion tracking.