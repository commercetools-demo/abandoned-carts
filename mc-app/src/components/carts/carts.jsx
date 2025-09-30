import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import DataTable from '@commercetools-uikit/data-table';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import { useCartsFetcher } from '../../hooks/use-carts-connector';
import messages from './messages';

const Carts = () => {
  const intl = useIntl();
  const { cartsPaginatedResult, error, loading } = useCartsFetcher();
  const [selectedCart, setSelectedCart] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle row click to show modal
  const handleRowClick = (cart) => {
    setSelectedCart(cart);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCart(null);
  };

  // Transform cart data for the table
  const cartRows = cartsPaginatedResult?.results?.map((cart) => {
    const cartData = cart.value || {};
    return {
      id: cart.id,
      email: cartData.customerEmail || 'N/A',
      total: cartData.cartTotal ? `$${cartData.cartTotal}` : 'N/A',
      abandonmentDate: cartData.abandonmentDate 
        ? new Date(cartData.abandonmentDate).toLocaleDateString()
        : new Date(cart.createdAt).toLocaleDateString(),
      // Store the original cart data for the modal
      originalCart: cart,
    };
  }) || [];

  const columns = [
    {
      key: 'email',
      label: intl.formatMessage(messages.emailColumn),
    },
    {
      key: 'total',
      label: intl.formatMessage(messages.totalColumn),
    },
    {
      key: 'abandonmentDate',
      label: intl.formatMessage(messages.abandonmentDateColumn),
    },
  ];

  if (loading) {
    return (
      <Constraints.Horizontal max={16}>
        <Spacings.Stack scale="xl">
          <Text.Headline as="h1" intlMessage={messages.title} />
          <Text.Body intlMessage={messages.loadingCarts} />
        </Spacings.Stack>
      </Constraints.Horizontal>
    );
  }

  if (error) {
    return (
      <Constraints.Horizontal max={16}>
        <Spacings.Stack scale="xl">
          <Text.Headline as="h1" intlMessage={messages.title} />
          <Text.Detail tone="critical" intlMessage={messages.errorLoadingCarts} />
        </Spacings.Stack>
      </Constraints.Horizontal>
    );
  }

  return (
    <Constraints.Horizontal max={16}>
      <Spacings.Stack scale="xl">
        <Text.Headline as="h1" intlMessage={messages.title} />
        <Text.Body intlMessage={messages.subtitle} />

        {cartRows.length === 0 ? (
          <Text.Detail tone="secondary" intlMessage={messages.noCartsFound} />
        ) : (
          <DataTable
            columns={columns}
            rows={cartRows}
            onRowClick={handleRowClick}
            itemRenderer={(item, column) => {
              switch (column.key) {
                case 'email':
                  return <Text.Body>{item.email}</Text.Body>;
                case 'total':
                  return <Text.Body>{item.total}</Text.Body>;
                case 'abandonmentDate':
                  return <Text.Body>{item.abandonmentDate}</Text.Body>;
                default:
                  return <Text.Body>{item[column.key]}</Text.Body>;
              }
            }}
          />
        )}

        {/* Popup overlay for displaying full JSON data */}
        {isModalOpen && selectedCart && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '80%',
              maxHeight: '80%',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}>
              <Spacings.Stack scale="m">
                <Text.Headline as="h3">Abandoned Cart Details</Text.Headline>
                <Text.Detail tone="secondary">Full JSON Data</Text.Detail>
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '16px', 
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  border: '1px solid #e0e0e0',
                }}>
                  {JSON.stringify(selectedCart.originalCart, null, 2)}
                </pre>
                <Spacings.Inline scale="m">
                  <PrimaryButton
                    label="Close"
                    onClick={handleCloseModal}
                  />
                </Spacings.Inline>
              </Spacings.Stack>
            </div>
          </div>
        )}
      </Spacings.Stack>
    </Constraints.Horizontal>
  );
};

Carts.displayName = 'Carts';

export default Carts;
