import { defineMessages } from 'react-intl';

export default defineMessages({
  title: {
    id: 'Carts.title',
    defaultMessage: 'Abandoned Carts',
  },
  subtitle: {
    id: 'Carts.subtitle',
    defaultMessage: 'View and manage abandoned shopping carts.',
  },
  emailColumn: {
    id: 'Carts.emailColumn',
    defaultMessage: 'Email Address',
  },
  totalColumn: {
    id: 'Carts.totalColumn',
    defaultMessage: 'Cart Total',
  },
  abandonmentDateColumn: {
    id: 'Carts.abandonmentDateColumn',
    defaultMessage: 'Abandonment Date',
  },
  emailSentColumn: {
    id: 'Carts.emailSentColumn',
    defaultMessage: 'Email Sent',
  },
  cartConvertedColumn: {
    id: 'Carts.cartConvertedColumn',
    defaultMessage: 'Cart Converted',
  },
  noCartsFound: {
    id: 'Carts.noCartsFound',
    defaultMessage: 'No abandoned carts found.',
  },
  loadingCarts: {
    id: 'Carts.loadingCarts',
    defaultMessage: 'Loading abandoned carts...',
  },
  errorLoadingCarts: {
    id: 'Carts.errorLoadingCarts',
    defaultMessage: 'Error loading abandoned carts.',
  },
});
