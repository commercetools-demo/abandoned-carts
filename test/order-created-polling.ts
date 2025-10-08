#!/usr/bin/env node

/**
 * Order Created Pub/Sub Message Polling Script
 *
 * This script polls for messages from the Google Cloud Pub/Sub topic:
 * projects/ct-sales-207211/topics/cb-order-created
 *
 * When it receives an order created message, it logs the order details
 * and can be extended to perform additional actions like updating
 * abandoned cart custom objects to mark them as converted.
 *
 * Usage:
 *   yarn poll-order-created
 *   or
 *   npx ts-node order-created-polling.ts
 */

import { PubSub } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';
import { ORDER_CREATED_PUBSUB_CONFIG } from './config';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Configuration from shared config
const PROJECT_ID = ORDER_CREATED_PUBSUB_CONFIG.PROJECT_ID;
const TOPIC_NAME = ORDER_CREATED_PUBSUB_CONFIG.TOPIC_NAME;
const SUBSCRIPTION_NAME = ORDER_CREATED_PUBSUB_CONFIG.SUBSCRIPTION_NAME;

// Order-created event handler configuration
const EVENT_HANDLER_URL = 'http://localhost:8082/event';

// File to store message data
const MESSAGE_DATA_FILE = path.join(__dirname, 'order-created-messages.json');

// Initialize Pub/Sub client
const pubsub = new PubSub({ projectId: PROJECT_ID });

/**
 * Write message data to file
 */
function writeMessageToFile(messageData: any) {
  try {
    const timestamp = new Date().toISOString();
    const messageEntry = {
      timestamp,
      messageId: messageData.id,
      publishTime: messageData.publishTime,
      data: messageData.data.toString(),
      attributes: messageData.attributes,
    };

    // Read existing messages or create empty array
    let messages = [];
    if (fs.existsSync(MESSAGE_DATA_FILE)) {
      try {
        const fileContent = fs.readFileSync(MESSAGE_DATA_FILE, 'utf8');
        messages = JSON.parse(fileContent);
      } catch (error) {
        console.log('⚠️  Could not parse existing message file, starting fresh');
        messages = [];
      }
    }

    // Add new message
    messages.push(messageEntry);

    // Write back to file
    fs.writeFileSync(MESSAGE_DATA_FILE, JSON.stringify(messages, null, 2));
    console.log(`📝 Message data written to file: ${MESSAGE_DATA_FILE}`);
    console.log(`📊 Total messages stored: ${messages.length}`);
  } catch (error) {
    console.error('❌ Error writing message to file:', error);
  }
}

/**
 * Decode base64 message data to JSON
 */
function decodeToJson(base64Data: string): any {
  try {
    const decodedString = Buffer.from(base64Data, 'base64').toString('utf8');
    return JSON.parse(decodedString);
  } catch (error) {
    console.error('Error decoding message data:', error);
    return null;
  }
}

/**
 * Send message to order-created event handler
 */
async function sendToEventHandler(originalMessage: any) {
  try {
    console.log(`📤 Sending message to event handler at ${EVENT_HANDLER_URL}...`);
    
    // Pass the original Pub/Sub message unmodified
    const pubSubMessage = {
      message: {
        data: originalMessage.data.toString('base64'),
        attributes: originalMessage.attributes,
        messageId: originalMessage.id,
        publishTime: originalMessage.publishTime,
      },
    };
    
    const response = await fetch(EVENT_HANDLER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pubSubMessage),
    });
    
    if (response.ok) {
      console.log(`✅ Successfully sent message to event handler (status: ${response.status})`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Event handler returned error (status: ${response.status}): ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Error sending message to event handler:`, error);
  }
}

/**
 * Process order created message
 */
async function processOrderCreatedMessage(originalMessage: any) {
  try {
    console.log(`📦 Processing order created message...`);

    // Write message data to file
    writeMessageToFile(originalMessage);

    // Parse the message data
    const messageData = originalMessage.data.toString();
    const parsedData = JSON.parse(messageData);
    console.log(`📋 Parsed Order Data:`, JSON.stringify(parsedData, null, 2));

    // Extract order information
    if (parsedData.order) {
      const order = parsedData.order;
      console.log(`\n🛒 Order Details:`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Order Number: ${order.orderNumber}`);
      console.log(`   Customer ID: ${order.customerId || 'Anonymous'}`);
      console.log(`   Customer Email: ${order.customerEmail || 'N/A'}`);
      console.log(`   Order State: ${order.orderState}`);
      console.log(`   Total Price: ${order.totalPrice ? `${order.totalPrice.currencyCode} ${(order.totalPrice.centAmount / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`   Line Items: ${order.lineItems?.length || 0}`);
      console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);

      // Send original message to order-created event handler
      await sendToEventHandler(originalMessage);
    }

    console.log(`✅ Order created message processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing order created message:`, error);
  }
}

async function main() {
  try {
    console.log('🚀 Starting Order Created Pub/Sub Polling Script');
    console.log('================================================');
    console.log(`📡 Project ID: ${PROJECT_ID}`);
    console.log(`📡 Topic: ${TOPIC_NAME}`);
    console.log(`📡 Subscription: ${SUBSCRIPTION_NAME}`);
    console.log('---');

    // Get the subscription
    const subscription = pubsub.subscription(SUBSCRIPTION_NAME);

    // Check if subscription exists
    const [subscriptionExists] = await subscription.exists();
    if (!subscriptionExists) {
      console.log(`⚠️  Subscription '${SUBSCRIPTION_NAME}' does not exist.`);
      console.log(`   Please create the subscription first.`);
      console.log(`   You can create it using: gcloud pubsub subscriptions create ${SUBSCRIPTION_NAME} --topic=${TOPIC_NAME}`);
      process.exit(1);
    }

    console.log(`✅ Subscription '${SUBSCRIPTION_NAME}' found`);
    console.log('---');

    // Set up message handler
    subscription.on('message', async (message: any) => {
      console.log(`📨 Received order created message at ${new Date().toISOString()}:`);
      console.log(`   Message ID: ${message.id}`);
      console.log(`   Data: ${message.data.toString()}`);
      console.log(`   Attributes:`, message.attributes);
      console.log(`   Publish Time: ${message.publishTime}`);
      console.log('---');

      // Parse the message data if it's JSON
      let parsedData = null;
      try {
        parsedData = JSON.parse(message.data.toString());
        console.log(`📋 Parsed Message Data:`, JSON.stringify(parsedData, null, 2));
      } catch (parseError) {
        console.log(`⚠️  Could not parse message data as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Check if this is an order created message
      if (parsedData && parsedData.type === 'OrderCreated') {
        console.log(`🎯 Detected Order Created message!`);
        console.log(`   Order ID: ${parsedData.order?.id || 'N/A'}`);
        console.log(`   Order Number: ${parsedData.order?.orderNumber || 'N/A'}`);

        // Process the order created message
        await processOrderCreatedMessage(message);
      } else {
        console.log(`ℹ️  Message is not an Order Created message, skipping processing`);
      }

      // Acknowledge the message
      message.ack();
      console.log(`✅ Message ${message.id} acknowledged`);
      console.log('---');
    });

    // Handle errors
    subscription.on('error', (error: any) => {
      console.error('❌ Subscription error:', error);
    });

    console.log(`🎧 Listening for order created messages on subscription '${SUBSCRIPTION_NAME}'...`);
    console.log('Press Ctrl+C to stop');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await subscription.close();
      console.log('👋 Goodbye!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { main as orderCreatedPollingScript };
