#!/usr/bin/env node

/**
 * CommerceTools Custom Object Creation Script
 * 
 * This script deletes existing custom object and creates a new one:
 * - Container: 'abandoned-carts'
 * - Key: '12345'
 * 
 * Usage:
 *   yarn create-obj
 */

import { createApiRoot } from './commercetools.js';
import { CUSTOM_OBJECT_CONFIG } from './config';

// Configuration
const CONTAINER = CUSTOM_OBJECT_CONFIG.CONTAINER;
const KEY = CUSTOM_OBJECT_CONFIG.KEY;


/**
 * Delete existing custom object if it exists
 */
async function deleteExistingCustomObject() {
  try {
    console.log('🗑️  Checking for existing custom object...');
    
    // Try to get existing object
    const existingObject = await createApiRoot()
      .customObjects()
      .withContainerAndKey({
        container: CONTAINER,
        key: KEY,
      })
      .get()
      .execute()
      .then((response: any) => response.body)
      .catch(() => null);

    if (existingObject) {
      console.log(`✅ Found existing object (version ${existingObject.version}), deleting...`);
      
      await createApiRoot()
        .customObjects()
        .withContainerAndKey({
          container: CONTAINER,
          key: KEY,
        })
        .delete({
          queryArgs: {
            version: existingObject.version,
          },
        })
        .execute();
        
      console.log('✅ Existing custom object deleted successfully!');
    } else {
      console.log('ℹ️  No existing custom object found.');
    }
    
    console.log('---');
  } catch (error) {
    console.log('ℹ️  No existing custom object to delete (or error occurred):', error instanceof Error ? error.message : String(error));
    console.log('---');
  }
}

/**
 * Create custom object with sample data
 */
async function createCustomObject() {
  try {
    console.log('🚀 Creating new custom object...');
    console.log(`📦 Container: ${CONTAINER}`);
    console.log(`🔑 Key: ${KEY}`);
    console.log('---');

    // Sample abandoned cart data matching service structure
    const customObjectData = {
      customerEmail: 'cboyke@gmail.com',
      cartTotal: '125.50',
      cartId: 'b8f6335c-d287-4557-98bd-aa052a7e8fc2',
      abandonmentDate: new Date().toISOString(),
      currencyCode: 'USD',
    };

    console.log('📋 Custom Object Data:');
    console.log(JSON.stringify(customObjectData, null, 2));
    console.log('---');
    
    // Create custom object
    const response = await createApiRoot()
      .customObjects()
      .post({
        body: {
          container: CONTAINER,
          key: KEY,
          value: customObjectData,
        },
      })
      .execute();

    console.log('✅ Custom object created successfully!');
    console.log('📊 Response Details:');
    console.log(`   ID: ${response.body.id}`);
    console.log(`   Version: ${response.body.version}`);
    console.log(`   Container: ${response.body.container}`);
    console.log(`   Key: ${response.body.key}`);
    console.log(`   Created At: ${response.body.createdAt}`);
    console.log(`   Last Modified At: ${response.body.lastModifiedAt}`);
    console.log('---');

    // Display the value
    console.log('📋 Value:');
    console.log(JSON.stringify(response.body.value, null, 2));

    return response.body;

  } catch (error) {
    console.error('❌ Error creating custom object:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Delete existing object first
    await deleteExistingCustomObject();
    
    // Create new object
    await createCustomObject();

    console.log('🎉 Script completed successfully!');

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

export { main as createCustomObjectScript };
