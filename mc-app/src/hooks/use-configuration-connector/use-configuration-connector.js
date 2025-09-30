import { useMcQuery, useMcMutation } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchConfigurationQuery from './fetch-configuration.ctp.graphql';
import CreateConfigurationMutation from './create-configuration.ctp.graphql';

const CONTAINER = 'abandoned-cart';
const KEY = 'configuration';

export const useConfigurationFetcher = () => {
  const { data, error, loading } = useMcQuery(FetchConfigurationQuery, {
    variables: {
      container: CONTAINER,
      key: KEY,
    },
    context: {
      target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
    },
  });

  return {
    configuration: data?.customObject,
    error,
    loading,
  };
};

export const useConfigurationUpdater = () => {
  const [createOrUpdateConfiguration, { loading }] = useMcMutation(
    CreateConfigurationMutation
  );

  const execute = async (configurationData) => {
    try {
      const value = JSON.stringify(configurationData);
      
      // Use createOrUpdateCustomObject which handles both create and update
      return await createOrUpdateConfiguration({
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
      console.error('Error saving configuration:', error);
      throw error;
    }
  };

  return {
    loading,
    execute,
  };
};
