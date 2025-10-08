import { useMcQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchServiceLogQuery from './fetch-service-log.ctp.graphql';

/**
 * Hook to fetch service log data from the service-log custom object
 */
export const useServiceLogFetcher = () => {
  const { data, error, loading, refetch } = useMcQuery(FetchServiceLogQuery, {
    variables: {
      container: 'abandoned-cart',
      key: 'service-log',
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    serviceLog: data?.customObject,
    error,
    loading,
    refetch,
  };
};
