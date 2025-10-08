import { createApiRoot } from './commercetools.js';
import { CUSTOM_OBJECT_CONFIG } from './config';


async function listAbandonedCartCustomObjects() {
  try {
    console.log('🚀 Starting CommerceTools Custom Objects listing script');
    console.log('📦 Container: abandoned-carts');
    console.log('---');

    // Fetch all custom objects in the abandoned-carts container
    const response = await createApiRoot()
      .customObjects()
      .get({
        queryArgs: {
          where: 'container="abandoned-carts"',
          limit: 100, // Adjust as needed
        },
      })
      .execute();

    const customObjects = response.body.results;

    console.log(`📊 Found ${customObjects.length} abandoned cart custom objects:`);
    console.log('---');

    if (customObjects.length === 0) {
      console.log('ℹ️  No abandoned cart custom objects found.');
      console.log('💡 Try creating one with option 2 in the test menu.');
    } else {
      customObjects.forEach((obj: any, index: number) => {
        console.log(`${index + 1}. 📋 Custom Object:`);
        console.log(`   ID: ${obj.id}`);
        console.log(`   Key: ${obj.key}`);
        console.log(`   Version: ${obj.version}`);
        console.log(`   Created: ${new Date(obj.createdAt).toLocaleString()}`);
        console.log(`   Modified: ${new Date(obj.lastModifiedAt).toLocaleString()}`);
        
        // Display value details
        if (obj.value) {
          console.log(`   📄 Value:`);
          console.log(`      Customer Email: ${obj.value.customerEmail || 'N/A'}`);
          console.log(`      Cart Total: ${obj.value.cartTotal || 'N/A'}`);
          console.log(`      Cart ID: ${obj.value.cartId || 'N/A'}`);
          console.log(`      Abandonment Date: ${obj.value.abandonmentDate ? new Date(obj.value.abandonmentDate).toLocaleString() : 'N/A'}`);
          console.log(`      Currency: ${obj.value.currencyCode || 'N/A'}`);
        }
        console.log('---');
      });
    }

    console.log('🎉 Script completed successfully!');

  } catch (error) {
    console.error('❌ Error listing custom objects:', error);
    throw error;
  }
}

async function main() {
  try {
    await listAbandonedCartCustomObjects();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
