#!/usr/bin/env node

/**
 * CommerceTools Cart Abandoned Field Unset Script
 * 
 * This script fetches all carts where the custom field 'abandoned' is set to true
 * and unsets it (removes the custom field).
 * 
 * Usage:
 *   yarn unset-abandoned
 *   or
 *   npx ts-node unset-abandoned-carts.ts
 */

import { createApiRoot } from './commercetools.js';

async function fetchCartsWithAbandonedField() {
  try {
    console.log('🔍 Fetching active carts with abandoned field set to true...');
    
    const response = await createApiRoot()
      .carts()
      .get({
        queryArgs: {
          where: 'custom(fields(abandoned = true)) and cartState = "Active"',
          limit: 100, // Adjust as needed
        },
      })
      .execute();

    const carts = response.body.results;
    
    if (carts.length === 0) {
      console.log('ℹ️  No carts found with abandoned field set to true.');
      return [];
    }

    console.log(`✅ Found ${carts.length} carts with abandoned field set to true:`);
    
    carts.forEach((cart: any, index: number) => {
      console.log(`\n--- Cart ${index + 1} ---`);
      console.log(`   ID: ${cart.id}`);
      console.log(`   Version: ${cart.version}`);
      console.log(`   Customer Email: ${cart.customerEmail || 'N/A'}`);
      console.log(`   Total Price: ${cart.totalPrice ? `${cart.totalPrice.currencyCode} ${cart.totalPrice.centAmount / 100}` : 'N/A'}`);
      console.log(`   Created At: ${cart.createdAt}`);
      console.log(`   Last Modified At: ${cart.lastModifiedAt}`);
      console.log(`   Abandoned Field: ${cart.custom?.fields?.abandoned || 'N/A'}`);
    });

    return carts;
  } catch (error) {
    console.error('❌ Error fetching carts with abandoned field:', error);
    throw error;
  }
}

async function unsetAbandonedField(cart: any) {
  try {
    console.log(`\n🔄 Unsetting abandoned field for cart ${cart.id}...`);
    
    // Set the abandoned field to false using setCustomType
    await createApiRoot()
      .carts()
      .withId({ ID: cart.id })
      .post({
        body: {
          version: cart.version,
          actions: [
            {
              action: 'setCustomType',
              type: {
                typeId: 'type',
                key: 'abandoned-cart-custom',
              },
              fields: {
                abandoned: false, // Set to false instead of true
              },
            },
          ],
        },
      })
      .execute();
    
    console.log(`✅ Successfully unset abandoned field for cart ${cart.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error unsetting abandoned field for cart ${cart.id}:`, error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('not in active state')) {
        console.log(`💡 Cart ${cart.id} is not in active state and cannot be modified.`);
        console.log(`   This cart may have been converted to an order or is otherwise inactive.`);
      } else if (error.message.includes('version')) {
        console.log(`💡 This might be a version conflict. The cart may have been modified since it was fetched.`);
      }
    }
    
    return false;
  }
}

async function unsetAllAbandonedFields(carts: any[]) {
  console.log(`\n🔄 Starting to unset abandoned field for ${carts.length} carts...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < carts.length; i++) {
    const cart = carts[i];
    console.log(`\n[${i + 1}/${carts.length}] Processing cart ${cart.id}...`);
    
    const success = await unsetAbandonedField(cart);
    
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Add a small delay to avoid rate limiting
    if (i < carts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n📊 Unset Summary:`);
  console.log(`   ✅ Successfully unset: ${successCount}`);
  console.log(`   ❌ Failed to unset: ${errorCount}`);
  console.log(`   📋 Total processed: ${carts.length}`);
  
  return { successCount, errorCount };
}

function createReadlineInterface() {
  const readline = require('readline');
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function confirmUnset(carts: any[]): Promise<boolean> {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    console.log(`\n⚠️  WARNING: You are about to unset the abandoned field for ${carts.length} carts!`);
    console.log(`   This will remove the custom field 'abandoned' from all these carts.`);
    console.log(`   Carts to process: ${carts.length}`);
    
    rl.question(`\nAre you absolutely sure you want to proceed? Type 'UNSET ALL' to confirm: `, (answer) => {
      rl.close();
      const confirmed = answer.trim() === 'UNSET ALL';
      resolve(confirmed);
    });
  });
}

async function main() {
  try {
    console.log('🚀 Starting Cart Abandoned Field Unset Script');
    console.log('============================================');
    console.log('📦 Target: Carts with abandoned field = true');
    console.log('---');
    
    // Step 1: Fetch all carts with abandoned field set to true
    const carts = await fetchCartsWithAbandonedField();
    
    if (carts.length === 0) {
      console.log('💡 No carts to process.');
      return;
    }
    
    // Step 2: Confirm unset operation
    const confirmed = await confirmUnset(carts);
    
    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');
      return;
    }
    
    // Step 3: Unset abandoned field for all carts
    const result = await unsetAllAbandonedFields(carts);
    
    if (result.errorCount === 0) {
      console.log('\n🎉 All abandoned fields unset successfully!');
    } else if (result.successCount > 0) {
      console.log('\n⚠️  Some abandoned fields were unset, but some failed.');
    } else {
      console.log('\n❌ Failed to unset any abandoned fields.');
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

export { main as unsetAbandonedCartsScript };
