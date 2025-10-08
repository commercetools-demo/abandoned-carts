#!/usr/bin/env node

/**
 * Resend Order Created Event Script
 *
 * This script loads order created message data from a file and sends it to
 * the order-created event handler on localhost:8082
 *
 * Usage:
 *   yarn resend-order-created
 *   or
 *   npx ts-node resend-order-created-event.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Event handler configuration
const EVENT_HANDLER_URL = 'http://localhost:8082/event';

// File containing message data
const MESSAGE_DATA_FILE = path.join(__dirname, 'order-created-messages.json');

/**
 * Load messages from file
 */
function loadMessagesFromFile(): any[] {
  try {
    if (!fs.existsSync(MESSAGE_DATA_FILE)) {
      console.log('❌ Message data file not found:', MESSAGE_DATA_FILE);
      console.log('💡 Run the order-created polling script first to collect messages');
      return [];
    }

    const fileContent = fs.readFileSync(MESSAGE_DATA_FILE, 'utf8');
    const messages = JSON.parse(fileContent);
    
    if (!Array.isArray(messages)) {
      console.log('❌ Invalid message file format');
      return [];
    }

    console.log(`📂 Loaded ${messages.length} messages from file`);
    return messages;
  } catch (error) {
    console.error('❌ Error loading messages from file:', error);
    return [];
  }
}

/**
 * Send message to order-created event handler
 */
async function sendMessageToEventHandler(messageData: any) {
  try {
    console.log(`📤 Sending message to event handler at ${EVENT_HANDLER_URL}...`);
    console.log(`   Message ID: ${messageData.messageId}`);
    console.log(`   Timestamp: ${messageData.timestamp}`);
    
    // Reconstruct the Pub/Sub message format
    const pubSubMessage = {
      message: {
        data: Buffer.from(messageData.data, 'utf8').toString('base64'),
        attributes: messageData.attributes,
        messageId: messageData.messageId,
        publishTime: messageData.publishTime,
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
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Event handler returned error (status: ${response.status}): ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending message to event handler:`, error);
    return false;
  }
}

/**
 * Display message details
 */
function displayMessageDetails(message: any, index: number) {
  console.log(`\n--- Message ${index + 1} ---`);
  console.log(`   Message ID: ${message.messageId}`);
  console.log(`   Timestamp: ${message.timestamp}`);
  console.log(`   Publish Time: ${message.publishTime}`);
  
  try {
    const parsedData = JSON.parse(message.data);
    if (parsedData.order) {
      console.log(`   Order ID: ${parsedData.order.id}`);
      console.log(`   Order Number: ${parsedData.order.orderNumber}`);
      console.log(`   Customer Email: ${parsedData.order.customerEmail || 'N/A'}`);
    }
  } catch (error) {
    console.log(`   Data: ${message.data.substring(0, 100)}...`);
  }
}

/**
 * Get user choice for which message to resend
 */
async function getUserChoice(maxIndex: number): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\nEnter the number of the message you want to resend (1-${maxIndex}), or 0 to resend all: `, (answer) => {
      rl.close();
      const choice = parseInt(answer.trim());

      if (isNaN(choice) || choice < 0 || choice > maxIndex) {
        console.log(`❌ Invalid choice. Please enter a number between 0 and ${maxIndex}.`);
        resolve(-1);
      } else {
        resolve(choice);
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Resend Order Created Event Script');
    console.log('==============================================');
    console.log(`📁 Message file: ${MESSAGE_DATA_FILE}`);
    console.log(`🎯 Target: ${EVENT_HANDLER_URL}`);
    console.log('---');

    // Load messages from file
    const messages = loadMessagesFromFile();

    if (messages.length === 0) {
      console.log('💡 No messages to resend. Exiting.');
      return;
    }

    // Display all messages
    console.log(`📋 Available messages:`);
    messages.forEach((message, index) => {
      displayMessageDetails(message, index);
    });

    // Get user choice
    const userChoice = await getUserChoice(messages.length);

    if (userChoice === -1) {
      console.log('❌ Invalid selection. Exiting.');
      return;
    }

    if (userChoice === 0) {
      // Resend all messages
      console.log(`\n🔄 Resending all ${messages.length} messages...`);
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < messages.length; i++) {
        console.log(`\n[${i + 1}/${messages.length}] Processing message ${messages[i].messageId}...`);
        const success = await sendMessageToEventHandler(messages[i]);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Add a small delay between messages
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('\n📊 Resend Summary:');
      console.log(`   ✅ Successfully sent: ${successCount}`);
      console.log(`   ❌ Failed to send: ${errorCount}`);
      console.log(`   📋 Total processed: ${successCount + errorCount}`);

    } else {
      // Resend specific message
      const selectedMessage = messages[userChoice - 1];
      console.log(`\n🔄 Resending message ${userChoice}...`);
      
      const success = await sendMessageToEventHandler(selectedMessage);
      
      if (success) {
        console.log('🎉 Message resent successfully!');
      } else {
        console.log('❌ Failed to resend message.');
      }
    }

    console.log('\n🎉 Script completed!');

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

export { main as resendOrderCreatedEventScript };
