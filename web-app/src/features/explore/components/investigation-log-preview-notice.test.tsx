/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { InvestigationLogRecord } from '../model/explore-investigation-contract';
import { InvestigationLogPreviewNotice } from './investigation-log-preview-notice';

const row = (uid: string, truncatedFields?: InvestigationLogRecord['truncatedFields']) =>
  ({ logRecordUid: uid, truncatedFields }) as InvestigationLogRecord;

describe('InvestigationLogPreviewNotice', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('shows distinct affected rows and scope-qualified field names', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <InvestigationLogPreviewNotice
          rows={[
            row('one', { attributes: ['arguments'], resourceAttributes: ['process.args'] }),
            row('one', { attributes: ['arguments'] }),
            row('two', { attributes: ['arguments'] })
          ]}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('note')).toHaveTextContent('2');
    expect(screen.getByRole('note')).toHaveTextContent('attributes.arguments');
    expect(screen.getByRole('note')).toHaveTextContent('resourceAttributes.process.args');
  });

  it('renders nothing for legacy rows without truncation metadata', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <InvestigationLogPreviewNotice rows={[row('old')]} />
      </I18nextProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
