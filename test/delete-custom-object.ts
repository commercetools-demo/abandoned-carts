#!/usr/bin/env node

/**
 * CommerceTools Custom Object Deletion Script
 * 
 * This script deletes a custom object using CommerceTools APIs
 * 
 * Usage:
 *   yarn delete-custom-object
 *   or
 *   npx ts-node delete-custom-object.ts
 */

import { createApiRoot } from './commercetools.js';
import { CUSTOM_OBJECT_CONFIG } from './config';


/**
 * Check if custom object exists and get its details
 */
async function getCustomObject() {
  try {
    const response = await createApiRoot()
      .customObjects()
      .get({
        queryArgs: {
          where: `container="${CUSTOM_OBJECT_CONFIG.CONTAINER}" and key="${CUSTOM_OBJECT_CONFIG.KEY}"`,
        },
      })
      .execute();

    return response.body.results.length > 0 ? response.body.results[0] : null;

  } catch (error) {
    console.error('❌ Error checking if custom object exists:', error);
    return null;
  }
}

/**
 * Delete a custom object
 */
async function deleteCustomObject(customObject: any) {
  try {
    console.log('🗑️  Deleting custom object...');
    console.log(`   ID: ${customObject.id}`);
    console.log(`   Version: ${customObject.version}`);
    console.log(`   Container: ${customObject.container}`);
    console.log(`   Key: ${customObject.key}`);
    console.log('---');
    
    await createApiRoot()
      .customObjects()
      .withContainerAndKey({
        container: CUSTOM_OBJECT_CONFIG.CONTAINER,
        key: CUSTOM_OBJECT_CONFIG.KEY,
      })
      .delete({
        queryArgs: {
          version: customObject.version,
        },
      })
      .execute();

    console.log('✅ Custom object deleted successfully!');
    console.log(`   Deleted: ${customObject.container}/${customObject.key}`);
    
    return true;

  } catch (error) {
    console.error('❌ Error deleting custom object:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('version')) {
        console.log('💡 This might be a version conflict. The object may have been modified since it was fetched.');
      } else if (error.message.includes('not found')) {
        console.log('💡 The custom object was not found. It may have already been deleted.');
      }
    }
    
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting CommerceTools Custom Object deletion script');
    console.log(`📦 Container: ${CUSTOM_OBJECT_CONFIG.CONTAINER}`);
    console.log(`🔑 Key: ${CUSTOM_OBJECT_CONFIG.KEY}`);
    console.log('---');

    // Check if the custom object exists
    console.log('🔍 Checking if custom object exists...');
    const customObject = await getCustomObject();
    
    if (!customObject) {
      console.log('⚠️  Custom object not found!');
      console.log(`   Container: ${CUSTOM_OBJECT_CONFIG.CONTAINER}`);
      console.log(`   Key: ${CUSTOM_OBJECT_CONFIG.KEY}`);
      console.log('---');
      console.log('💡 The custom object may have already been deleted or never existed.');
      console.log('🎉 Script completed (nothing to delete)');
      return;
    }

    console.log('✅ Custom object found!');
    console.log(`   ID: ${customObject.id}`);
    console.log(`   Version: ${customObject.version}`);
    console.log(`   Created At: ${customObject.createdAt}`);
    console.log(`   Last Modified At: ${customObject.lastModifiedAt}`);
    console.log('---');

    // Display the current value
    console.log('📋 Current Value:');
    console.log(JSON.stringify(customObject.value, null, 2));
    console.log('---');

    // Delete the custom object
    await deleteCustomObject(customObject);

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

export { main as deleteCustomObjectScript };
