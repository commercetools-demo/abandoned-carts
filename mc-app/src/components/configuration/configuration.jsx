import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import TextInput from '@commercetools-uikit/text-input';
import NumberInput from '@commercetools-uikit/number-input';
import SelectInput from '@commercetools-uikit/select-input';
import RichTextInput from '@commercetools-uikit/rich-text-input';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import { useDiscountsFetcher } from '../../hooks/use-discounts-connector';
import {
  useConfigurationFetcher,
  useConfigurationUpdater,
} from '../../hooks/use-configuration-connector';
import messages from './messages';

const Configuration = () => {
  const intl = useIntl();
  const [formData, setFormData] = useState({
    abandonAfterHours: '',
    ignoreCartsOlderThan: '',
    discount: '',
    emailSubject: '',
    emailTemplate: '<p></p>', // RichTextInput expects HTML content
  });
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [richTextKey, setRichTextKey] = useState(0); // Key to force RichTextInput re-render

  // Fetch discounts from CommerceTools
  const {
    discountsPaginatedResult,
    error: discountsError,
    loading: discountsLoading,
  } = useDiscountsFetcher();

  // Fetch existing configuration
  const { configuration: existingConfiguration, loading: configLoading } =
    useConfigurationFetcher();

  // Configuration updater
  const { loading: saveLoading, execute: saveConfiguration } =
    useConfigurationUpdater();

  // Filter and transform fetched cart discounts into dropdown options
  const discountOptions =
    discountsPaginatedResult?.results
      ?.filter((discount) => {
        // Only show discounts that have the abandoned cart predicate
        return discount.cartPredicate?.includes('custom.abandoned = true');
      })
      ?.map((discount) => {
        const currentLocale = intl.locale;

        // Try to find name in current locale, then English, then use key, then id
        const name =
          discount.nameAllLocales?.find((name) => name.locale === currentLocale)
            ?.value ||
          discount.nameAllLocales?.find((name) => name.locale === 'en')
            ?.value ||
          discount.nameAllLocales?.[0]?.value || // Use first available locale
          discount.key ||
          discount.id;

        return {
          value: discount.id,
          label: name,
        };
      }) || [];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Load existing configuration when it's fetched
  React.useEffect(() => {
    if (existingConfiguration?.value) {
      // The value is already parsed as an object by Apollo Client
      const configData = existingConfiguration.value;
      let emailTemplateValue = configData.emailTemplate || '<p></p>';
      setFormData({
        abandonAfterHours: configData.abandonAfterHours || '',
        ignoreCartsOlderThan: configData.ignoreCartsOlderThan || '',
        discount: configData.discount || '',
        emailSubject: configData.emailSubject || '',
        emailTemplate: emailTemplateValue, // Default to empty paragraph for RichTextInput
      });
      // Force RichTextInput to re-render with new data
      setRichTextKey((prev) => prev + 1);
    }
  }, [existingConfiguration]);

  const handleSave = async () => {
    try {
      setSaveStatus(null); // Clear any previous status
      await saveConfiguration(formData);
      setSaveStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving configuration:', error);

      // Clear error message after 5 seconds
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  // Discard the edits and go back to what is stored. A Cancel that does
  // nothing is worse than no Cancel: it reads as "reverted" and is not.
  const handleCancel = () => {
    const configData = existingConfiguration?.value ?? {};
    setFormData({
      abandonAfterHours: configData.abandonAfterHours || '',
      ignoreCartsOlderThan: configData.ignoreCartsOlderThan || '',
      discount: configData.discount || '',
      emailSubject: configData.emailSubject || '',
      emailTemplate: configData.emailTemplate || '<p></p>',
    });
    setRichTextKey((prev) => prev + 1);
    setSaveStatus(null);
  };

  return (
    <Constraints.Horizontal max={16}>
      <Spacings.Stack scale="xl">
        <Text.Headline as="h1" intlMessage={messages.title} />
        <Text.Body intlMessage={messages.subtitle} />

        <Spacings.Stack scale="l">
          {/* Abandon After Hours Field */}
          <Spacings.Inline scale="s" alignItems="center">
            <Text.Body
              as="label"
              intlMessage={messages.abandonAfterHoursLabel}
            />
            {/* NumberInput, not TextInput with type="number": TextInput does
                not forward min/max/step to the input, so the bounds were
                never enforced and fractions of an hour could not be typed. */}
            <NumberInput
              value={formData.abandonAfterHours}
              onChange={(event) =>
                handleInputChange('abandonAfterHours', event.target.value)
              }
              placeholder={intl.formatMessage(
                messages.abandonAfterHoursPlaceholder
              )}
              min={0}
              max={168}
              step={0.25}
              horizontalConstraint={3}
            />
            <Text.Detail tone="secondary">
              hours (0.25 is fifteen minutes)
            </Text.Detail>
          </Spacings.Inline>

          {/* Ignore Carts Older Than Field */}
          <Spacings.Inline scale="s" alignItems="center">
            <Text.Body
              as="label"
              intlMessage={messages.ignoreCartsOlderThanLabel}
            />
            <NumberInput
              value={formData.ignoreCartsOlderThan}
              onChange={(event) =>
                handleInputChange('ignoreCartsOlderThan', event.target.value)
              }
              placeholder={intl.formatMessage(
                messages.ignoreCartsOlderThanPlaceholder
              )}
              min={1}
              max={365}
              step={1}
              horizontalConstraint={3}
            />
            <Text.Detail tone="secondary">days</Text.Detail>
          </Spacings.Inline>

          {/* Discount Field */}
          <Spacings.Stack scale="s">
            <Text.Body as="label" intlMessage={messages.discountLabel} />
            {discountsLoading ? (
              <Text.Detail tone="secondary">Loading discounts...</Text.Detail>
            ) : discountsError ? (
              <Text.Detail tone="critical">Error loading discounts</Text.Detail>
            ) : discountOptions.length === 0 ? (
              <Text.Detail tone="secondary">
                No abandoned cart discounts found. Create cart discounts with
                predicate "custom.abandoned = true" to see them here.
              </Text.Detail>
            ) : (
              <SelectInput
                value={formData.discount}
                onChange={(event) =>
                  handleInputChange('discount', event.target.value)
                }
                options={discountOptions}
                placeholder={intl.formatMessage(messages.discountPlaceholder)}
                horizontalConstraint={8}
              />
            )}
          </Spacings.Stack>

          {/* Email Subject Field */}
          <Spacings.Stack scale="s">
            <Text.Body as="label" intlMessage={messages.emailSubjectLabel} />
            <TextInput
              value={formData.emailSubject}
              onChange={(event) =>
                handleInputChange('emailSubject', event.target.value)
              }
              placeholder={intl.formatMessage(messages.emailSubjectPlaceholder)}
            />
          </Spacings.Stack>

          {/* Email Template Field */}
          <Spacings.Stack scale="s">
            <Text.Body as="label" intlMessage={messages.emailTemplateLabel} />
            <RichTextInput
              key={richTextKey} // Force re-render when data changes
              value={formData.emailTemplate}
              onChange={(event) =>
                handleInputChange('emailTemplate', event.target.value)
              }
              placeholder={intl.formatMessage(
                messages.emailTemplatePlaceholder
              )}
              horizontalConstraint="scale"
              defaultExpandMultilineText={true}
            />
          </Spacings.Stack>

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
      </Spacings.Stack>
    </Constraints.Horizontal>
  );
};

Configuration.displayName = 'Configuration';

export default Configuration;
