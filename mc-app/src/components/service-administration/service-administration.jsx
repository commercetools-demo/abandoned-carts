import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useApolloClient } from '@apollo/client';
import Card from '@commercetools-uikit/card';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import TextInput from '@commercetools-uikit/text-input';
import ToggleInput from '@commercetools-uikit/toggle-input';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import { useServiceAdministrationFetcher, useServiceAdministrationUpdater } from '../../hooks/use-service-administration-connector';
import { processAbandonedCarts } from '../../service';
import { testCartQuery } from '../../service/test-service';
import messages from './messages';

const ServiceAdministration = () => {
  const intl = useIntl();
  const apolloClient = useApolloClient();
  const [formData, setFormData] = useState({
    serviceActivated: false,
    runEveryHours: '',
  });
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [serviceStatus, setServiceStatus] = useState(null); // 'running', 'success', 'error', or null
  const [serviceMessage, setServiceMessage] = useState('');

  // Fetch existing service administration settings
  const { serviceAdministration: existingSettings, error: configError, loading: configLoading } = useServiceAdministrationFetcher();
  
  // Service administration updater
  const { loading: saveLoading, execute: saveServiceAdministration } = useServiceAdministrationUpdater();

  // Load existing settings when they're fetched
  React.useEffect(() => {
    if (existingSettings?.value) {
      // The value is already parsed as an object by Apollo Client
      const settingsData = existingSettings.value;
      setFormData({
        serviceActivated: settingsData.serviceActivated || false,
        runEveryHours: settingsData.runEveryHours || '',
      });
    }
  }, [existingSettings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaveStatus(null); // Clear any previous status
      await saveServiceAdministration(formData);
      setSaveStatus('success');
      console.log('Service administration settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving service administration settings:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleCancel = () => {
    console.log('Cancelling service administration changes');
    // Reset form to original values
    if (existingSettings?.value) {
      const settingsData = existingSettings.value;
      setFormData({
        serviceActivated: settingsData.serviceActivated || false,
        runEveryHours: settingsData.runEveryHours || '',
      });
    } else {
      setFormData({
        serviceActivated: false,
        runEveryHours: '',
      });
    }
  };

  const handleRunNow = async () => {
    try {
      setServiceStatus('running');
      setServiceMessage('Testing cart query...');
      
      // First test the basic cart query
      const testResult = await testCartQuery(apolloClient);
      
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
      
      setServiceMessage('Cart query successful, processing abandoned carts...');
      
      // If test passes, run the full service
      const result = await processAbandonedCarts(apolloClient);
      
      if (result.success) {
        setServiceStatus('success');
        setServiceMessage(result.message);
        
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

        {/* Service Configuration */}
        <Card>
          <Spacings.Stack scale="l">
            <Text.Subheadline as="h2" intlMessage={messages.serviceConfigurationTitle} />
            
            {/* Service Activated Switch */}
            <Spacings.Inline scale="s" alignItems="center">
              <Text.Body as="label" intlMessage={messages.serviceActivatedLabel} />
              <ToggleInput
                isChecked={formData.serviceActivated}
                onChange={(event) => handleInputChange('serviceActivated', event.target.checked)}
              />
            </Spacings.Inline>

            {/* Run Every Hours Field */}
            <Spacings.Inline scale="s" alignItems="center">
              <Text.Body as="label" intlMessage={messages.runEveryHoursLabel} />
              <TextInput
                value={formData.runEveryHours}
                onChange={(event) => handleInputChange('runEveryHours', event.target.value)}
                placeholder={intl.formatMessage(messages.runEveryHoursPlaceholder)}
                type="number"
                min="1"
                max="168"
                horizontalConstraint={3}
              />
              <Text.Detail tone="secondary">
                hours
              </Text.Detail>
            </Spacings.Inline>

            {/* Save Status Feedback */}
            {saveStatus && (
              <Spacings.Stack scale="s">
                {saveStatus === 'success' && (
                  <Text.Detail tone="positive">
                    {intl.formatMessage(messages.saveSuccess)}
                  </Text.Detail>
                )}
                {saveStatus === 'error' && (
                  <Text.Detail tone="critical">
                    {intl.formatMessage(messages.saveError)}
                  </Text.Detail>
                )}
              </Spacings.Stack>
            )}

            {/* Action Buttons */}
            <Spacings.Inline scale="m">
              <PrimaryButton
                label={intl.formatMessage(messages.saveButton)}
                onClick={handleSave}
                isDisabled={saveLoading || configLoading}
              />
              <SecondaryButton
                label={intl.formatMessage(messages.cancelButton)}
                onClick={handleCancel}
                isDisabled={saveLoading || configLoading}
              />
            </Spacings.Inline>
          </Spacings.Stack>
        </Card>

        {/* Service Status */}
        <Card>
          <Spacings.Stack scale="m">
            <Text.Subheadline as="h2" intlMessage={messages.statusTitle} />
            <Spacings.Inline scale="l" alignItems="center">
              <Text.Detail tone="secondary">
                {intl.formatMessage(messages.lastRunLabel)} {new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString()}
              </Text.Detail>
              <Text.Detail tone="secondary">
                {intl.formatMessage(messages.cartsProcessedLabel)} 23 carts
              </Text.Detail>
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
                  <Text.Detail tone="secondary">
                    {serviceMessage}
                  </Text.Detail>
                )}
                {serviceStatus === 'success' && (
                  <Text.Detail tone="positive">
                    {serviceMessage}
                  </Text.Detail>
                )}
                {serviceStatus === 'error' && (
                  <Text.Detail tone="critical">
                    {serviceMessage}
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
