import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AlertNoticeTemplateFields } from './alert-notice-template-fields';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, containerClassName: _containerClassName, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzCodeEditor: ({ value, readOnly, language, onChange: _onChange, name, ...props }: any) => (
    <div
      data-testid={props['data-testid']}
      data-alert-notice-template-code-editor-owner={props['data-alert-notice-template-code-editor-owner']}
      data-alert-notice-template-code-editor={props['data-alert-notice-template-code-editor']}
      data-alert-notice-template-viewer-code-editor={props['data-alert-notice-template-viewer-code-editor']}
      data-hz-ui="code-editor-frame"
      data-hz-code-editor-runtime="codemirror"
      data-hz-code-editor-language={language}
      data-hz-code-editor-readonly={readOnly ? 'true' : undefined}
    >
      <input type="hidden" readOnly name={name} value={value} data-hz-code-editor-value="hidden" />
      {value}
    </div>
  )
}));

describe('AlertNoticeTemplateFields', () => {
  const t = createTranslatorMock({ locale: 'zh-CN' });

  it('renders the current notice template editor with a real notice type selector', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-notice-template-fields.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <AlertNoticeTemplateFields
        t={t}
        draft={{
          name: 'Ops webhook digest',
          type: '1',
          preset: false,
          content: 'Alert body'
        }}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-template-fields="true"');
    expect(html).toContain('data-alert-notice-template-layout="angular-aligned-modal-form"');
    expect(html).toContain('data-alert-notice-template-form="aligned-label-control"');
    expect(html).toContain('data-alert-notice-template-form-row="name"');
    expect(html).toContain('data-alert-notice-template-form-row="type"');
    expect(html).toContain('data-alert-notice-template-form-row="preset"');
    expect(html).toContain('data-alert-notice-template-form-row="content"');
    expect(html).toContain('grid-cols-[132px_minmax(0,1fr)]');
    expect(html).toContain('data-alert-notice-template-type-selector="cold-select"');
    expect(html).toContain('data-alert-notice-template-type-required="angular-required-select"');
    expect(html).toContain('data-alert-notice-template-type-required-owner="route-validation-contract"');
    expect(html).toContain('data-alert-notice-template-preset-view="readonly-type-pill"');
    expect(html).toContain('data-alert-notice-template-code-editor-owner="hertzbeat-ui-code-editor"');
    expect(html).toContain('data-alert-notice-template-code-editor="template-content"');
    expect(html).toContain('data-hz-ui="code-editor-frame"');
    expect(html).toContain('data-hz-code-editor-runtime="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="html"');
    expect(html).toContain('data-hz-code-editor-value="hidden"');
    expect(html).toContain('name="template_content"');
    expect(html).not.toContain('data-alert-authoring-textarea="cold-textarea"');
    expect(html).toContain('alert.notice.template.name');
    expect(html).toContain('data-testid="notice-template-field-name"');
    expect(html).toContain('data-testid="notice-template-field-type"');
    expect(html).toContain('data-testid="notice-template-field-preset"');
    expect(html).toContain('data-testid="notice-template-field-content"');
    expect(html).toContain(t('alert.notice.template.preset'));
    expect(html).toContain(t('alert.notice.template.preset.false'));
    expect(html).toContain(t('alert.notice.type.email'));
    expect(html).toContain('Webhook');
    expect(html).toContain('Telegram');
    expect(html).not.toContain(t('alert.notice.type.telegram-bot'));
    expect(html).toContain('value="9"');
    expect(html.indexOf('value="9"')).toBeLessThan(html.indexOf('value="8"'));
    expect(html.indexOf('value="8"')).toBeLessThan(html.indexOf('value="4"'));
    expect(html).not.toContain('value="3"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(html).not.toContain('md:col-span-2');
    expect(source).toContain("from '../ui/select'");
    expect(source).toContain("from '@hertzbeat/ui'");
    expect(source).toContain('HzCodeEditor');
    expect(source).toContain('data-alert-notice-template-code-editor-owner="hertzbeat-ui-code-editor"');
    expect(source).toContain("['2', 'alert.notice.type.url']");
    expect(source).toContain("['9', 'alert.notice.type.discord']");
    expect(source).toContain("['8', 'alert.notice.type.slack']");
    expect(source).toContain("['7', 'alert.notice.type.telegram']");
    expect(source).toContain('label: t(key)');
    expect(source).toContain("const typeValue = draft.type || '';");
    expect(source).toContain("t('alert.notice.receiver.type.placeholder')");
    expect(source).toContain('data-alert-notice-template-type-required="angular-required-select"');
    expect(source).toContain('data-alert-notice-template-type-required-owner="route-validation-contract"');
    expect(source).not.toContain("['3', 'alert.notice.type.wechat'");
    expect(source).not.toMatch(/\['0', 'alert\.notice\.type\.sms', '\u77ed\u4fe1'\]/);
    expect(source).toContain('data-alert-notice-template-type-selector="cold-select"');
    expect(source).toContain('data-alert-notice-template-preset-view="readonly-type-pill"');
    expect(source).toContain("draft.preset ? t('alert.notice.template.preset.true') : t('alert.notice.template.preset.false')");
    expect(source).toContain('data-alert-notice-template-code-editor="template-content"');
    expect(source).toContain('readOnly');
    expect(source).not.toContain("from '../workbench/primitives'");
    expect(source).not.toContain('AlertAuthoringTextarea');
    expect(source).not.toContain('EditorRow');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
  });

  it('keeps new notice templates on Angular required-select placeholder until type is chosen', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeTemplateFields
        t={t}
        draft={{
          name: 'Ops digest',
          type: '',
          preset: false,
          content: 'Alert body'
        }}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-template-type-required="angular-required-select"');
    expect(html).toContain('data-alert-notice-template-type-required-owner="route-validation-contract"');
    expect(html).toContain('<select');
    expect(html).toContain('value="" disabled=""');
    expect(html).toContain(t('alert.notice.receiver.type.placeholder'));
    expect(html).toContain('value="1"');
  });

  it('renders a read-only template viewer without save-facing editable controls', () => {
    const html = renderToStaticMarkup(
      <AlertNoticeTemplateFields
        t={t}
        readOnly
        draft={{
          name: 'EmailTemplate',
          type: '1',
          preset: true,
          content: 'System preset template body'
        }}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-template-readonly="true"');
    expect(html).toContain('data-alert-notice-template-viewer-code-editor="readonly-code-editor"');
    expect(html).toContain('data-hz-code-editor-readonly="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-alert-notice-template-form-row="preset"');
    expect(html).toContain(t('alert.notice.template.preset.true'));
    expect(html).toContain('System preset template body');
  });
});
