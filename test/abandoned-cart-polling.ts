#!/usr/bin/env node

/**
 * Abandoned Cart Pub/Sub Message Polling Script
 *
 * This script polls for messages from the Google Cloud Pub/Sub topic:
 * projects/ct-sales-207211/topics/cb-custom-object
 *
 * When it receives an abandoned cart custom object message, it automatically
 * forwards the message to the mail-sender service running on localhost:8081
 *
 * Usage:
 *   yarn poll-abandoned-cart
 *   or
 *   npx ts-node abandoned-cart-polling.ts
 */

import { PubSub } from '@google-cloud/pubsub';
import * as dotenv from 'dotenv';
import { ABANDONED_CART_PUBSUB_CONFIG } from './config';

// Load environment variables
dotenv.config();

// Mail-sender configuration
const MAIL_SENDER_URL = 'http://localhost:8081/mailSender';

// Configuration from shared config
const PROJECT_ID = ABANDONED_CART_PUBSUB_CONFIG.PROJECT_ID;
const TOPIC_NAME = ABANDONED_CART_PUBSUB_CONFIG.TOPIC_NAME;
const SUBSCRIPTION_NAME = ABANDONED_CART_PUBSUB_CONFIG.SUBSCRIPTION_NAME;

// Initialize Pub/Sub client
const pubsub = new PubSub({ projectId: PROJECT_ID });

/**
 * Send message to mail-sender
 */
async function sendToMailSender(originalMessage: any) {
  try {
    console.log(`📧 Sending message to mail-sender at ${MAIL_SENDER_URL}`);
    
    // Pass the original Pub/Sub message unmodified
    const pubSubMessage = {
      message: {
        data: originalMessage.data.toString('base64'),
        attributes: originalMessage.attributes,
        messageId: originalMessage.id,
        publishTime: originalMessage.publishTime,
      },
    };
    
    console.log(`📦 Message ID: ${originalMessage.id}`);
    console.log(`📦 Publish Time: ${originalMessage.publishTime}`);
    
    const response = await fetch(MAIL_SENDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pubSubMessage)
    });

    if (response.ok) {
      console.log(`✅ Successfully sent message to mail-sender (Status: ${response.status})`);
    } else {
      console.error(`❌ Failed to send message to mail-sender (Status: ${response.status})`);
      const errorText = await response.text();
      console.error(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Error sending message to mail-sender:`, error);
  }
}

/**
 * Create a subscription if it doesn't exist
 */
async function createSubscriptionIfNotExists() {
  try {
    const topic = pubsub.topic(TOPIC_NAME);
    const subscription = topic.subscription(SUBSCRIPTION_NAME);
    
    // Check if subscription exists
    const [exists] = await subscription.exists();
    
    if (!exists) {
      console.log(`Creating subscription: ${SUBSCRIPTION_NAME}`);
      await topic.createSubscription(SUBSCRIPTION_NAME, {
        ackDeadlineSeconds: 60,
        messageRetentionDuration: {
          seconds: 600, // 10 minutes
        },
      });
      console.log(`✅ Subscription ${SUBSCRIPTION_NAME} created successfully`);
    } else {
      console.log(`✅ Subscription ${SUBSCRIPTION_NAME} already exists`);
    }
    
    return subscription;
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    throw error;
  }
}

/**
 * Poll for messages from the subscription
 */
async function pollMessages(subscription: any) {
  console.log(`🔍 Starting to poll messages from subscription: ${SUBSCRIPTION_NAME}`);
  console.log(`📡 Topic: ${TOPIC_NAME}`);
  console.log(`⏰ Polling started at: ${new Date().toISOString()}`);
  console.log('---');

  // Set up message handler
  subscription.on('message', async (message: any) => {
    console.log(`📨 Received message at ${new Date().toISOString()}:`);
    console.log(`   Message ID: ${message.id}`);
    console.log(`   Data: ${message.data.toString()}`);
    console.log(`   Attributes:`, message.attributes);
    console.log(`   Publish Time: ${message.publishTime}`);
    console.log('---');

    // Parse the message data if it's JSON
    let parsedData = null;
    try {
      parsedData = JSON.parse(message.data.toString());
      console.log(`📋 Parsed Data:`, JSON.stringify(parsedData, null, 2));
    } catch (parseError) {
      console.log(`⚠️  Could not parse message data as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Check if this is a custom object message and send to mail-sender
    if (parsedData && 
        parsedData.notificationType === 'ResourceCreated' && 
        parsedData.resource?.typeId === 'key-value-document' &&
        parsedData.resourceUserProvidedIdentifiers?.containerAndKey?.container === 'abandoned-carts') {
      
      console.log(`🎯 Detected abandoned cart custom object message!`);
      console.log(`   Container: ${parsedData.resourceUserProvidedIdentifiers.containerAndKey.container}`);
      console.log(`   Key: ${parsedData.resourceUserProvidedIdentifiers.containerAndKey.key}`);
      
      // Send to mail-sender (pass original message object)
      await sendToMailSender(message);
    } else {
      console.log(`ℹ️  Message is not an abandoned cart custom object, skipping mail-sender`);
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

  // Start listening
  subscription.on('close', () => {
    console.log('🔚 Subscription closed');
  });

  console.log('🎧 Listening for messages... (Press Ctrl+C to stop)');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Google Cloud Pub/Sub polling script');
    console.log(`📊 Project: ${PROJECT_ID}`);
    console.log(`📢 Topic: ${TOPIC_NAME}`);
    console.log('---');

    // Create subscription if needed
    const subscription = await createSubscriptionIfNotExists();

    // Start polling
    await pollMessages(subscription);

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      subscription.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      subscription.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { main as pollPubSubMessages };
