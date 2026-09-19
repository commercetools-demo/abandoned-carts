import { defineMessages } from 'react-intl';

export default defineMessages({
  title: {
    id: 'Configuration.title',
    defaultMessage: 'Abandoned Carts Configuration',
  },
  subtitle: {
    id: 'Configuration.subtitle',
    defaultMessage: 'Configure your abandoned cart settings and preferences.',
  },
  abandonAfterHoursLabel: {
    id: 'Configuration.abandonAfterHoursLabel',
    defaultMessage: 'Mark carts abandoned after',
  },
  abandonAfterHoursPlaceholder: {
    id: 'Configuration.abandonAfterHoursPlaceholder',
    defaultMessage: 'Enter hours',
  },
  ignoreCartsOlderThanLabel: {
    id: 'Configuration.ignoreCartsOlderThanLabel',
    defaultMessage: 'Ignore carts older than',
  },
  ignoreCartsOlderThanPlaceholder: {
    id: 'Configuration.ignoreCartsOlderThanPlaceholder',
    defaultMessage: 'Enter days',
  },
  discountLabel: {
    id: 'Configuration.discountLabel',
    defaultMessage: 'Discount to apply',
  },
  discountPlaceholder: {
    id: 'Configuration.discountPlaceholder',
    defaultMessage: 'Select discount',
  },
  emailSubjectLabel: {
    id: 'Configuration.emailSubjectLabel',
    defaultMessage: 'Email subject',
  },
  emailSubjectPlaceholder: {
    id: 'Configuration.emailSubjectPlaceholder',
    defaultMessage: 'Enter email subject',
  },
  emailTemplateLabel: {
    id: 'Configuration.emailTemplateLabel',
    defaultMessage: 'Email template',
  },
  emailTemplatePlaceholder: {
    id: 'Configuration.emailTemplatePlaceholder',
    defaultMessage: 'Enter your email template here...',
  },
  variableHint: {
    id: 'Configuration.variableHint',
    defaultMessage:
      'Variables are inserted from the toolbar and behave as one character — backspace removes the whole chip, and there is no way to type inside one.',
  },
  previewLabel: {
    id: 'Configuration.previewLabel',
    defaultMessage: 'Preview',
  },
  previewHint: {
    id: 'Configuration.previewHint',
    defaultMessage:
      'Rendered by the same code that sends it, with example values in place of a real cart.',
  },
  saveButton: {
    id: 'Configuration.saveButton',
    defaultMessage: 'Save Configuration',
  },
  cancelButton: {
    id: 'Configuration.cancelButton',
    defaultMessage: 'Cancel',
  },
  saveSuccess: {
    id: 'Configuration.saveSuccess',
    defaultMessage: 'Configuration saved successfully!',
  },
  saveError: {
    id: 'Configuration.saveError',
    defaultMessage: 'Failed to save configuration. Please try again.',
  },
});
