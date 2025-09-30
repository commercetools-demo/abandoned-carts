import { processAbandonedCarts } from '../services/abandoned-cart.service';
import { createApiRoot } from '../client/create.client';

// Mock the CommerceTools client
jest.mock('../client/create.client');

// Mock the configuration utils
jest.mock('../utils/config.utils', () => ({
  readConfiguration: () => ({
    clientId: 'mock-client-id-24-chars',
    clientSecret: 'mock-client-secret-32-chars-long',
    projectKey: 'mock-project-key',
    scope: 'mock-scope',
    region: 'us-central1',
  }),
}));

describe('Abandoned Cart Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process abandoned carts successfully', async () => {
    // Mock the API responses
    const mockCartsResponse = {
      body: {
        results: [
          {
            id: 'cart-1',
            customerEmail: 'test@example.com',
            totalPrice: {
              centAmount: 10000,
              currencyCode: 'USD',
            },
            lastModifiedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          },
        ],
        total: 1,
      },
    };

    const mockCustomObjectResponse = {
      body: {
        id: 'custom-object-1',
        version: 1,
        container: 'abandoned-carts',
        key: 'cart-1',
        value: {},
      },
    };

    const mockConfigurationResponse = {
      body: {
        value: {
          abandonAfterHours: '24',
          ignoreCartsOlderThan: '30',
        },
      },
    };

    // Mock the createApiRoot function
    const mockApiRoot = {
      carts: () => ({
        get: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue(mockCartsResponse),
        }),
      }),
      customObjects: () => ({
        post: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue(mockCustomObjectResponse),
        }),
        withContainerAndKey: () => ({
          get: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(mockConfigurationResponse),
          }),
        }),
      }),
    };

    (createApiRoot as jest.Mock).mockReturnValue(mockApiRoot);

    const result = await processAbandonedCarts();

    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(1);
    expect(result.totalCreated).toBe(1);
    expect(result.configuration?.abandonAfterHours).toBe(24);
    expect(result.configuration?.ignoreCartsOlderThanDays).toBe(30);
  });

  it('should skip carts that are too recent', async () => {
    const mockCartsResponse = {
      body: {
        results: [
          {
            id: 'cart-1',
            customerEmail: 'test@example.com',
            totalPrice: {
              centAmount: 10000,
              currencyCode: 'USD',
            },
            lastModifiedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          },
        ],
        total: 1,
      },
    };

    const mockConfigurationResponse = {
      body: {
        value: {
          abandonAfterHours: '24',
          ignoreCartsOlderThan: '30',
        },
      },
    };

    const mockApiRoot = {
      carts: () => ({
        get: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue(mockCartsResponse),
        }),
      }),
      customObjects: () => ({
        withContainerAndKey: () => ({
          get: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(mockConfigurationResponse),
          }),
        }),
      }),
    };

    (createApiRoot as jest.Mock).mockReturnValue(mockApiRoot);

    const result = await processAbandonedCarts();

    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(1);
    expect(result.totalCreated).toBe(0); // Should skip recent cart
  });
});
