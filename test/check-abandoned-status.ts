#!/usr/bin/env node

/**
 * CommerceTools Cart Abandoned Field Status Check Script
 * 
 * This script checks the status of the abandoned field for all carts
 * (both active and inactive) to see which ones have it set.
 * 
 * Usage:
 *   yarn check-abandoned-status
 *   or
 *   npx ts-node check-abandoned-status.ts
 */

import { createApiRoot } from './commercetools.js';

async function checkAllCartsAbandonedStatus() {
  try {
    console.log('🔍 Checking abandoned field status for all carts...');
    
    // First check active carts
    const activeResponse = await createApiRoot()
      .carts()
      .get({
        queryArgs: {
          where: 'custom(fields(abandoned = true)) and cartState = "Active"',
          limit: 100,
        },
      })
      .execute();

    const activeCarts = activeResponse.body.results;
    
    // Then check inactive carts
    const inactiveResponse = await createApiRoot()
      .carts()
      .get({
        queryArgs: {
          where: 'custom(fields(abandoned = true)) and cartState != "Active"',
          limit: 100,
        },
      })
      .execute();

    const inactiveCarts = inactiveResponse.body.results;
    
    console.log(`\n📊 Abandoned Field Status Summary:`);
    console.log(`   ✅ Active carts with abandoned=true: ${activeCarts.length}`);
    console.log(`   ⚠️  Inactive carts with abandoned=true: ${inactiveCarts.length}`);
    console.log(`   📋 Total carts with abandoned=true: ${activeCarts.length + inactiveCarts.length}`);
    
    if (activeCarts.length > 0) {
      console.log(`\n🟢 Active Carts with abandoned field set to true:`);
      activeCarts.forEach((cart: any, index: number) => {
        console.log(`\n--- Active Cart ${index + 1} ---`);
        console.log(`   ID: ${cart.id}`);
        console.log(`   Version: ${cart.version}`);
        console.log(`   Customer Email: ${cart.customerEmail || 'N/A'}`);
        console.log(`   Total Price: ${cart.totalPrice ? `${cart.totalPrice.currencyCode} ${cart.totalPrice.centAmount / 100}` : 'N/A'}`);
        console.log(`   Created At: ${cart.createdAt}`);
        console.log(`   Last Modified At: ${cart.lastModifiedAt}`);
        console.log(`   Cart State: ${cart.cartState}`);
        console.log(`   Abandoned Field: ${cart.custom?.fields?.abandoned || 'N/A'}`);
      });
    }
    
    if (inactiveCarts.length > 0) {
      console.log(`\n🔴 Inactive Carts with abandoned field set to true:`);
      inactiveCarts.forEach((cart: any, index: number) => {
        console.log(`\n--- Inactive Cart ${index + 1} ---`);
        console.log(`   ID: ${cart.id}`);
        console.log(`   Version: ${cart.version}`);
        console.log(`   Customer Email: ${cart.customerEmail || 'N/A'}`);
        console.log(`   Total Price: ${cart.totalPrice ? `${cart.totalPrice.currencyCode} ${cart.totalPrice.centAmount / 100}` : 'N/A'}`);
        console.log(`   Created At: ${cart.createdAt}`);
        console.log(`   Last Modified At: ${cart.lastModifiedAt}`);
        console.log(`   Cart State: ${cart.cartState}`);
        console.log(`   Abandoned Field: ${cart.custom?.fields?.abandoned || 'N/A'}`);
      });
    }
    
    if (activeCarts.length === 0 && inactiveCarts.length === 0) {
      console.log('\n🎉 No carts found with abandoned field set to true!');
    } else if (activeCarts.length === 0) {
      console.log('\n💡 All carts with abandoned field are inactive and cannot be modified.');
      console.log('   These carts may have been converted to orders or are otherwise inactive.');
    }
    
    return { activeCarts, inactiveCarts };
  } catch (error) {
    console.error('❌ Error checking abandoned field status:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Cart Abandoned Field Status Check');
    console.log('============================================');
    console.log('📦 Checking all carts (active and inactive)');
    console.log('---');
    
    await checkAllCartsAbandonedStatus();
    
    console.log('\n🎉 Status check completed!');
    
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

export { main as checkAbandonedStatusScript };
