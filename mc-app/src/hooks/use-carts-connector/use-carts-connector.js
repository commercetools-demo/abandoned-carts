import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchCartsQuery from './fetch-carts.ctp.graphql';

const CONTAINER = 'abandoned-carts';

export const useCartsFetcher = () => {
  const { data, error, loading } = useMcQuery(FetchCartsQuery, {
    variables: {
      container: CONTAINER,
      limit: 100,
      offset: 0,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  return {
    cartsPaginatedResult: data?.customObjects,
    error,
    loading,
  };
};
