#!/usr/bin/env node

import { createApiRoot } from './commercetools.js';
import { CUSTOM_OBJECT_CONFIG } from './config';
import * as readline from 'readline';


async function listActiveCarts() {
  try {
    console.log('🚀 Fetching active carts...');
    
    const response = await createApiRoot()
      .carts()
      .get({
        queryArgs: {
          where: 'cartState = "Active"',
          limit: 50, // Limit to avoid too many results
        },
      })
      .execute();

    const carts = response.body.results;
    
    if (carts.length === 0) {
      console.log('ℹ️  No active carts found.');
      return [];
    }

    console.log(`✅ Found ${carts.length} active carts:`);
    
    const cartsWithDetails = [];
    
    for (let i = 0; i < carts.length; i++) {
      const cart = carts[i];
      
      console.log(`\n--- Cart ${i + 1} ---`);
      console.log(`   Cart ID: ${cart.id}`);
      console.log(`   Version: ${cart.version}`);
      console.log(`   Customer ID: ${cart.customerId || 'Anonymous'}`);
      console.log(`   Customer Email: ${cart.customerEmail || 'N/A'}`);
      console.log(`   Cart State: ${cart.cartState}`);
      console.log(`   Total Price: ${cart.totalPrice ? `${cart.totalPrice.currencyCode} ${(cart.totalPrice.centAmount / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`   Line Items: ${cart.lineItems?.length || 0}`);
      console.log(`   Created: ${new Date(cart.createdAt).toLocaleString()}`);
      console.log(`   Last Modified: ${new Date(cart.lastModifiedAt).toLocaleString()}`);
      console.log(`   Abandoned Field: ${cart.custom?.fields?.abandoned || 'Not set'}`);
      
      cartsWithDetails.push({
        index: i + 1,
        cart: cart,
      });
    }

    return cartsWithDetails;
  } catch (error) {
    console.error('❌ Error fetching active carts:', error);
    throw error;
  }
}


async function addShippingAddressToCart(cartId: string, cartVersion: number) {
  try {
    console.log(`\n📍 Adding shipping address to cart ${cartId}...`);
    
    // Add a stub shipping address with country 'US'
    const updatedCart = await createApiRoot()
      .carts()
      .withId({ ID: cartId })
      .post({
        body: {
          version: cartVersion,
          actions: [
            {
              action: 'setShippingAddress',
              address: {
                country: 'US',
                firstName: 'John',
                lastName: 'Doe',
                streetName: '123 Main St',
                city: 'Anytown',
                postalCode: '12345',
                state: 'CA',
              },
            },
          ],
        },
      })
      .execute()
      .then((response: any) => response.body);

    console.log(`✅ Shipping address added successfully`);
    console.log(`   Country: ${updatedCart.shippingAddress?.country}`);
    console.log(`   City: ${updatedCart.shippingAddress?.city}`);
    console.log(`   Postal Code: ${updatedCart.shippingAddress?.postalCode}`);
    console.log(`   New Cart Version: ${updatedCart.version}`);
    
    return updatedCart;
  } catch (error) {
    console.error(`❌ Error adding shipping address to cart:`, error);
    throw error;
  }
}

async function createOrderFromCart(cartId: string, cartVersion: number) {
  try {
    console.log(`\n🛒 Creating order from cart ${cartId}...`);
    
    // First add shipping address to the cart
    const cartWithAddress = await addShippingAddressToCart(cartId, cartVersion);
    
    // Create order from cart using the CommerceTools API
    // Reference: https://docs.commercetools.com/api/projects/orders#create-order-from-cart
    const order = await createApiRoot()
      .orders()
      .post({
        body: {
          id: cartId,
          version: cartWithAddress.version, // Use the updated cart version
        },
      })
      .execute()
      .then((response: any) => response.body);

    console.log(`✅ Order created successfully!`);
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Order Number: ${order.orderNumber}`);
    console.log(`   Version: ${order.version}`);
    console.log(`   Order State: ${order.orderState}`);
    console.log(`   Customer ID: ${order.customerId || 'Anonymous'}`);
    console.log(`   Customer Email: ${order.customerEmail || 'N/A'}`);
    console.log(`   Total Price: ${order.totalPrice ? `${order.totalPrice.currencyCode} ${(order.totalPrice.centAmount / 100).toFixed(2)}` : 'N/A'}`);
    console.log(`   Line Items: ${order.lineItems?.length || 0}`);
    console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);

    return order;
  } catch (error) {
    console.error(`❌ Error creating order from cart:`, error);
    throw error;
  }
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function getUserChoice(maxIndex: number): Promise<number> {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(`\nEnter the number of the cart you want to create an order from (1-${maxIndex}): `, (answer) => {
      rl.close();
      const choice = parseInt(answer.trim());
      
      if (isNaN(choice) || choice < 1 || choice > maxIndex) {
        console.log(`❌ Invalid choice. Please enter a number between 1 and ${maxIndex}.`);
        resolve(-1);
      } else {
        resolve(choice);
      }
    });
  });
}


async function main() {
  try {
    console.log('🚀 Starting Order Creation from Active Cart Script');
    console.log('================================================');
    
    // Step 1: List active carts
    const cartsWithDetails = await listActiveCarts();
    
    if (cartsWithDetails.length === 0) {
      console.log('💡 No active carts available to create orders from.');
      return;
    }
    
    // Step 2: Let user choose a cart
    const userChoice = await getUserChoice(cartsWithDetails.length);
    
    if (userChoice === -1) {
      console.log('❌ Invalid selection. Exiting.');
      return;
    }
    
    const selectedCart = cartsWithDetails[userChoice - 1];
    const cart = selectedCart.cart;
    
    // Step 3: Create order from cart (no confirmation needed)
    const order = await createOrderFromCart(cart.id, cart.version);
    
    console.log('\n🎉 Order creation completed successfully!');
    console.log(`📧 The cart has been converted to an order.`);
    
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

export { main as createOrderFromCartScript };
