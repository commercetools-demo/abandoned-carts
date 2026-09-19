import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import Constraints from '@commercetools-uikit/constraints';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import NumberInput from '@commercetools-uikit/number-input';
import SelectInput from '@commercetools-uikit/select-input';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import { useDiscountsFetcher } from '../../hooks/use-discounts-connector';
import {
  useConfigurationFetcher,
  useConfigurationUpdater,
} from '../../hooks/use-configuration-connector';
import RichEmailEditor from '../rich-email-editor';
import {
  DEFAULT_TEMPLATE,
  exampleVars,
  renderHtmlTemplate,
  renderTextTemplate,
  validateTemplate,
} from '../../email-template';
import messages from './messages';

const Configuration = () => {
  const intl = useIntl();
  const [formData, setFormData] = useState({
    abandonAfterHours: '',
    ignoreCartsOlderThan: '',
    // A Project with no configuration yet starts from the shipped template
    // rather than from nothing. An empty subject and body are both save
    // errors, so an empty start would present a form that cannot be
    // submitted until the merchandiser guesses what is missing.
    discount: '',
    emailSubject: DEFAULT_TEMPLATE.subject,
    emailTemplate: DEFAULT_TEMPLATE.body,
  });
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  // Bumping this remounts both editors. Slate holds its own document after
  // mount, so handing it a new `value` prop does nothing — the fetched
  // configuration would never appear.
  const [editorKey, setEditorKey] = useState(0);

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
      setFormData({
        abandonAfterHours: configData.abandonAfterHours || '',
        ignoreCartsOlderThan: configData.ignoreCartsOlderThan || '',
        discount: configData.discount || '',
        emailSubject: configData.emailSubject || DEFAULT_TEMPLATE.subject,
        emailTemplate: configData.emailTemplate || DEFAULT_TEMPLATE.body,
      });
      setEditorKey((prev) => prev + 1);
    }
  }, [existingConfiguration]);

  /**
   * What is wrong with the email, worst first.
   *
   * Errors block saving. The editor cannot produce most of them — a chip is
   * indivisible — but a template can also arrive from a Project that
   * predates the editor, or be written straight into the Custom Object, and
   * this screen is the last place anyone looks before a shopper does.
   */
  const problems = useMemo(
    () =>
      validateTemplate({
        subject: formData.emailSubject,
        body: formData.emailTemplate,
      }),
    [formData.emailSubject, formData.emailTemplate]
  );
  const errors = problems.filter((p) => p.severity === 'error');
  const warnings = problems.filter((p) => p.severity === 'warning');

  /**
   * The email as it will arrive, rendered by the code that sends it.
   *
   * `renderHtmlTemplate` is the mail-sender's own function, so a preview
   * that looks right is evidence rather than a mock-up. Example values come
   * from the same variable list the drop-down is built from.
   */
  const preview = useMemo(() => {
    const vars = exampleVars();
    return {
      subject: renderTextTemplate(formData.emailSubject, vars),
      html: renderHtmlTemplate(formData.emailTemplate, vars),
    };
  }, [formData.emailSubject, formData.emailTemplate]);

  const handleSave = async () => {
    if (errors.length > 0) return;
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
      emailSubject: configData.emailSubject || DEFAULT_TEMPLATE.subject,
      emailTemplate: configData.emailTemplate || DEFAULT_TEMPLATE.body,
    });
    setEditorKey((prev) => prev + 1);
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
            <RichEmailEditor
              key={`subject-${editorKey}`}
              mode="text"
              value={formData.emailSubject}
              onChange={(text) => handleInputChange('emailSubject', text)}
            />
          </Spacings.Stack>

          {/* Email Template Field */}
          <Spacings.Stack scale="s">
            <Text.Body as="label" intlMessage={messages.emailTemplateLabel} />
            <RichEmailEditor
              key={`body-${editorKey}`}
              value={formData.emailTemplate}
              onChange={(html) => handleInputChange('emailTemplate', html)}
            />
            <Text.Detail tone="secondary">
              {intl.formatMessage(messages.variableHint)}
            </Text.Detail>
          </Spacings.Stack>

          {/* What would stop this being sent */}
          {problems.length > 0 && (
            <Spacings.Stack scale="xs">
              {errors.map((problem) => (
                <Text.Detail key={problem.message} tone="critical">
                  {problem.message}
                </Text.Detail>
              ))}
              {warnings.map((problem) => (
                <Text.Detail key={problem.message} tone="warning">
                  {problem.message}
                </Text.Detail>
              ))}
            </Spacings.Stack>
          )}

          {/* The email as it will arrive */}
          <Spacings.Stack scale="s">
            <Text.Body as="label" intlMessage={messages.previewLabel} />
            <Text.Detail tone="secondary">
              {intl.formatMessage(messages.previewHint)}
            </Text.Detail>
            <Text.Detail isBold>{preview.subject}</Text.Detail>
            <iframe
              // Keyed on the content: an iframe written with srcDoc does not
              // reload when the attribute changes, so without this the
              // preview keeps showing the first render while the subject
              // above it updates — which reads as a rendering bug.
              key={preview.html}
              title={intl.formatMessage(messages.previewLabel)}
              srcDoc={preview.html}
              sandbox=""
              style={{
                width: '100%',
                height: 320,
                border: '1px solid #e3e3e8',
                borderRadius: 4,
                background: '#fff',
              }}
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
              isDisabled={saveLoading || configLoading || errors.length > 0}
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
