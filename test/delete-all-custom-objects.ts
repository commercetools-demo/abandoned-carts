#!/usr/bin/env node

import { createApiRoot } from './commercetools.js';
import * as readline from 'readline';
import { CUSTOM_OBJECT_CONFIG } from './config';

const CONTAINER = CUSTOM_OBJECT_CONFIG.CONTAINER;


async function listAllCustomObjectsInContainer() {
  try {
    console.log(`🔍 Fetching all custom objects in container "${CONTAINER}"...`);
    
    const response = await createApiRoot()
      .customObjects()
      .get({
        queryArgs: {
          where: `container="${CONTAINER}"`,
        },
      })
      .execute();

    const customObjects = response.body.results;
    
    if (customObjects.length === 0) {
      console.log(`ℹ️  No custom objects found in container "${CONTAINER}".`);
      return [];
    }

    console.log(`✅ Found ${customObjects.length} custom objects in container "${CONTAINER}":`);
    
    customObjects.forEach((obj: any, index: number) => {
      console.log(`\n--- Object ${index + 1} ---`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Key: ${obj.key}`);
      console.log(`   Version: ${obj.version}`);
      console.log(`   Created At: ${obj.createdAt}`);
      console.log(`   Last Modified At: ${obj.lastModifiedAt}`);
      
      // Show some key data from the value
      const cartData = obj.value;
      if (cartData) {
        console.log(`   Customer Email: ${cartData.customerEmail || 'N/A'}`);
        console.log(`   Cart Total: ${cartData.cartTotal ? `$${cartData.cartTotal}` : 'N/A'}`);
        console.log(`   Cart ID: ${cartData.cartId || 'N/A'}`);
        console.log(`   Abandonment Date: ${cartData.abandonmentDate ? new Date(cartData.abandonmentDate).toLocaleDateString() : 'N/A'}`);
      }
    });

    return customObjects;
  } catch (error) {
    console.error('❌ Error fetching custom objects:', error);
    throw error;
  }
}

async function deleteCustomObject(container: string, key: string, version: number) {
  try {
    await createApiRoot()
      .customObjects()
      .withContainerAndKey({
        container: container,
        key: key,
      })
      .delete({
        queryArgs: {
          version: version,
        },
      })
      .execute();
    
    console.log(`✅ Deleted custom object: ${container}/${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting custom object ${container}/${key}:`, error);
    return false;
  }
}

async function deleteAllCustomObjects(customObjects: any[]) {
  console.log(`\n🗑️  Starting deletion of ${customObjects.length} custom objects...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < customObjects.length; i++) {
    const obj = customObjects[i];
    console.log(`\n[${i + 1}/${customObjects.length}] Deleting ${obj.container}/${obj.key}...`);
    
    const success = await deleteCustomObject(obj.container, obj.key, obj.version);
    
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Add a small delay to avoid rate limiting
    if (i < customObjects.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n📊 Deletion Summary:`);
  console.log(`   ✅ Successfully deleted: ${successCount}`);
  console.log(`   ❌ Failed to delete: ${errorCount}`);
  console.log(`   📋 Total processed: ${customObjects.length}`);
  
  return { successCount, errorCount };
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function confirmDeletion(customObjects: any[]): Promise<boolean> {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    console.log(`\n⚠️  WARNING: You are about to delete ALL ${customObjects.length} custom objects in container "${CONTAINER}"!`);
    console.log(`   This action cannot be undone.`);
    console.log(`   Container: ${CONTAINER}`);
    console.log(`   Objects to delete: ${customObjects.length}`);
    
    rl.question(`\nAre you absolutely sure you want to proceed? Type 'DELETE ALL' to confirm: `, (answer) => {
      rl.close();
      const confirmed = answer.trim() === 'DELETE ALL';
      resolve(confirmed);
    });
  });
}

async function main() {
  try {
    console.log('🚀 Starting Delete All Custom Objects Script');
    console.log('============================================');
    console.log(`📦 Container: ${CONTAINER}`);
    console.log('---');
    
    // Step 1: List all custom objects in the container
    const customObjects = await listAllCustomObjectsInContainer();
    
    if (customObjects.length === 0) {
      console.log('💡 No custom objects to delete.');
      return;
    }
    
    // Step 2: Confirm deletion
    const confirmed = await confirmDeletion(customObjects);
    
    if (!confirmed) {
      console.log('❌ Deletion cancelled by user.');
      return;
    }
    
    // Step 3: Delete all custom objects
    const result = await deleteAllCustomObjects(customObjects);
    
    if (result.errorCount === 0) {
      console.log('\n🎉 All custom objects deleted successfully!');
    } else if (result.successCount > 0) {
      console.log('\n⚠️  Some custom objects were deleted, but some failed.');
    } else {
      console.log('\n❌ Failed to delete any custom objects.');
    }
    
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

export { main as deleteAllCustomObjectsScript };
