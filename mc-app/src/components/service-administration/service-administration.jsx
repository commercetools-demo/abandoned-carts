import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import Card from '@commercetools-uikit/card';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import { useServiceLogFetcher } from '../../hooks/use-service-log-connector';
import { useConfigurationFetcher } from '../../hooks/use-configuration-connector';
import {
  getServiceUrl,
  processAbandonedCarts,
  testAbandonedCartService,
} from '../../services/abandoned-cart-http-service';
import messages from './messages';

const ServiceAdministration = () => {
  const intl = useIntl();
  const [serviceStatus, setServiceStatus] = useState(null); // 'running', 'success', 'error', or null
  const [serviceMessage, setServiceMessage] = useState('');

  // Fetch service log data
  const { serviceLog, refetch: refetchServiceLog } = useServiceLogFetcher();

  // Fetch configuration data
  const {
    configuration,
    error: configurationError,
    loading: configurationLoading,
    refetch: refetchConfiguration,
  } = useConfigurationFetcher();

  // Parse configuration value if it exists
  const parsedConfiguration = React.useMemo(() => {
    if (configuration?.value) {
      try {
        return typeof configuration.value === 'string'
          ? JSON.parse(configuration.value)
          : configuration.value;
      } catch (error) {
        console.error('Error parsing configuration value:', error);
        return null;
      }
    }
    return null;
  }, [configuration?.value]);

  const handleRunNow = async () => {
    try {
      setServiceStatus('running');
      setServiceMessage('Testing service connection...');

      // First test the service connection
      const testResult = await testAbandonedCartService();

      if (!testResult.success) {
        setServiceStatus('error');
        setServiceMessage(testResult.message);

        // Clear error message after 8 seconds
        setTimeout(() => {
          setServiceStatus(null);
          setServiceMessage('');
        }, 8000);
        return;
      }

      setServiceMessage(
        'Service connection successful, processing abandoned carts...'
      );

      // If test passes, run the full service
      const result = await processAbandonedCarts();

      if (result.success) {
        setServiceStatus('success');
        setServiceMessage(result.message);

        // Refetch service log data to get updated statistics
        try {
          await refetchServiceLog();
        } catch (refetchError) {
          console.warn('Failed to refetch service log data:', refetchError);
        }

        // Clear success message after 5 seconds
        setTimeout(() => {
          setServiceStatus(null);
          setServiceMessage('');
        }, 5000);
      } else {
        setServiceStatus('error');
        setServiceMessage(result.message);

        // Clear error message after 8 seconds
        setTimeout(() => {
          setServiceStatus(null);
          setServiceMessage('');
        }, 8000);
      }
    } catch (error) {
      setServiceStatus('error');
      setServiceMessage(`Failed to run service: ${error.message}`);
      console.error('Error running abandoned cart service:', error);

      // Clear error message after 8 seconds
      setTimeout(() => {
        setServiceStatus(null);
        setServiceMessage('');
      }, 8000);
    }
  };

  return (
    <Constraints.Horizontal max={16}>
      <Spacings.Stack scale="xl">
        <Text.Headline as="h1" intlMessage={messages.title} />
        <Text.Body intlMessage={messages.subtitle} />

        {/* Service Status */}
        <Card>
          <Spacings.Stack scale="m">
            <Text.Subheadline as="h2" intlMessage={messages.statusTitle} />

            {/* Service URL Display */}
            <Spacings.Stack scale="s">
              <Text.Detail tone="secondary">
                <strong>Service URL:</strong>{' '}
                {getServiceUrl() || 'not configured'}
              </Text.Detail>
            </Spacings.Stack>

            {/* Current Configuration Display */}
            {configurationLoading && (
              <Text.Detail tone="secondary">
                Loading configuration...
              </Text.Detail>
            )}
            {configurationError && (
              <Text.Detail tone="critical">
                Error loading configuration: {configurationError.message}
              </Text.Detail>
            )}
            {parsedConfiguration && (
              <Spacings.Stack scale="s">
                <Spacings.Inline scale="m" alignItems="center">
                  <Text.Detail tone="secondary">
                    <strong>Current Configuration:</strong>
                  </Text.Detail>
                  <SecondaryButton
                    label="Refresh"
                    onClick={refetchConfiguration}
                    isDisabled={configurationLoading}
                    size="small"
                  />
                </Spacings.Inline>
                <Spacings.Inline scale="m">
                  <Text.Detail tone="secondary">
                    • Abandon after:{' '}
                    {parsedConfiguration.abandonAfterHours || 'N/A'} hours
                  </Text.Detail>
                  <Text.Detail tone="secondary">
                    • Ignore carts older than:{' '}
                    {parsedConfiguration.ignoreCartsOlderThan || 'N/A'} days
                  </Text.Detail>
                </Spacings.Inline>
                {parsedConfiguration.emailSubject && (
                  <Text.Detail tone="secondary">
                    • Email Subject: {parsedConfiguration.emailSubject}
                  </Text.Detail>
                )}
                {parsedConfiguration.emailTemplate && (
                  <Text.Detail tone="secondary">
                    • Email Template:{' '}
                    {parsedConfiguration.emailTemplate.substring(0, 100)}...
                  </Text.Detail>
                )}
              </Spacings.Stack>
            )}
            {!configurationLoading &&
              !configurationError &&
              !parsedConfiguration && (
                <Text.Detail tone="secondary">
                  No configuration found. Please configure the abandoned cart
                  settings.
                </Text.Detail>
              )}

            <Spacings.Inline scale="l" alignItems="center">
              <PrimaryButton
                label={intl.formatMessage(messages.runNowButton)}
                onClick={handleRunNow}
                isDisabled={serviceStatus === 'running'}
              />
            </Spacings.Inline>

            {/* Service Execution Status */}
            {serviceStatus && (
              <Spacings.Stack scale="s">
                {serviceStatus === 'running' && (
                  <Text.Detail tone="secondary">{serviceMessage}</Text.Detail>
                )}
                {serviceStatus === 'success' && (
                  <Text.Detail tone="positive">{serviceMessage}</Text.Detail>
                )}
                {serviceStatus === 'error' && (
                  <Text.Detail tone="critical">{serviceMessage}</Text.Detail>
                )}
              </Spacings.Stack>
            )}

            {/* Detailed Service Results */}
            {serviceLog?.value && (
              <Spacings.Stack scale="s">
                <Text.Detail tone="secondary">
                  <strong>Last Run:</strong>{' '}
                  {new Date(serviceLog.value.lastRunTime).toLocaleString()}
                </Text.Detail>
                <Spacings.Inline scale="m">
                  <Text.Detail tone="secondary">
                    • Carts Fetched: {serviceLog.value.cartsFetched || 0}
                  </Text.Detail>
                  <Text.Detail tone="secondary">
                    • Abandoned Carts:{' '}
                    {serviceLog.value.abandonedCartObjectsCreated || 0}
                  </Text.Detail>
                  <Text.Detail tone="secondary">
                    • Processing Duration:{' '}
                    {serviceLog.value.processingDuration
                      ? `${Math.round(
                          serviceLog.value.processingDuration / 1000
                        )}s`
                      : 'N/A'}
                  </Text.Detail>
                </Spacings.Inline>
                {(serviceLog.value.skippedByCap > 0 ||
                  serviceLog.value.skippedNoEmail > 0 ||
                  serviceLog.value.skippedEmpty > 0) && (
                  <Spacings.Inline scale="m">
                    {serviceLog.value.skippedEmpty > 0 && (
                      <Text.Detail tone="secondary">
                        • Empty carts skipped: {serviceLog.value.skippedEmpty}
                      </Text.Detail>
                    )}
                    {serviceLog.value.skippedNoEmail > 0 && (
                      <Text.Detail tone="secondary">
                        • No reachable email: {serviceLog.value.skippedNoEmail}
                      </Text.Detail>
                    )}
                    {serviceLog.value.skippedByCap > 0 && (
                      <Text.Detail tone="warning">
                        • Held for the next run by the cap of{' '}
                        {serviceLog.value.maxPerRun}:{' '}
                        {serviceLog.value.skippedByCap}
                      </Text.Detail>
                    )}
                  </Spacings.Inline>
                )}
                {serviceLog.value.status === 'error' && (
                  <Text.Detail tone="critical">
                    Last run failed: {serviceLog.value.error}
                  </Text.Detail>
                )}
              </Spacings.Stack>
            )}
          </Spacings.Stack>
        </Card>
      </Spacings.Stack>
    </Constraints.Horizontal>
  );
};

ServiceAdministration.displayName = 'ServiceAdministration';

export default ServiceAdministration;
