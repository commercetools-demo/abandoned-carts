import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchCartDiscountsQuery from './fetch-discounts.ctp.graphql';

export const useDiscountsFetcher = () => {
  const { data, error, loading } = useMcQuery(FetchCartDiscountsQuery, {
    variables: {
      limit: 100,
      offset: 0,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  return {
    discountsPaginatedResult: data?.cartDiscounts,
    error,
    loading,
  };
};
