import { useMcQuery, useMcMutation } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchServiceAdministrationQuery from './fetch-service-administration.ctp.graphql';
import CreateServiceAdministrationMutation from './create-service-administration.ctp.graphql';

const CONTAINER = 'abandoned-cart';
const KEY = 'service-administration';

export const useServiceAdministrationFetcher = () => {
  const { data, error, loading } = useMcQuery(FetchServiceAdministrationQuery, {
    variables: {
      container: CONTAINER,
      key: KEY,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  return {
    serviceAdministration: data?.customObject,
    error,
    loading,
  };
};

export const useServiceAdministrationUpdater = () => {
  const [createOrUpdateServiceAdministration, { loading }] = useMcMutation(
    CreateServiceAdministrationMutation
  );

  const execute = async (serviceAdministrationData) => {
    try {
      const value = JSON.stringify(serviceAdministrationData);
      
      // Use createOrUpdateCustomObject which handles both create and update
      return await createOrUpdateServiceAdministration({
        context: {
          target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
        },
        variables: {
          container: CONTAINER,
          key: KEY,
          value,
        },
      });
    } catch (error) {
      console.error('Error saving service administration:', error);
      throw error;
    }
  };

  return {
    loading,
    execute,
  };
};
