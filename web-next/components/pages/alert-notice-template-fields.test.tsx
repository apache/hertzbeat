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

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, readOnly, language, onChange: _onChange, ...props }: any) => (
    <div
      data-testid={props['data-testid']}
      data-alert-notice-template-code-editor={props['data-alert-notice-template-code-editor']}
      data-alert-notice-template-viewer-code-editor={props['data-alert-notice-template-viewer-code-editor']}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-readonly={readOnly ? 'true' : undefined}
    >
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
    expect(html).toContain('data-alert-notice-template-preset-view="readonly-type-pill"');
    expect(html).toContain('data-alert-notice-template-code-editor="template-content"');
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="html"');
    expect(html).not.toContain('data-alert-authoring-textarea="cold-textarea"');
    expect(html).toContain('alert.notice.template.name');
    expect(html).toContain('data-testid="notice-template-field-name"');
    expect(html).toContain('data-testid="notice-template-field-type"');
    expect(html).toContain('data-testid="notice-template-field-preset"');
    expect(html).toContain('data-testid="notice-template-field-content"');
    expect(html).toContain('模版类型');
    expect(html).toContain('用户自定义模版');
    expect(html).toContain('邮箱');
    expect(html).toContain('WebHook');
    expect(html).toContain('value="9"');
    expect(html.indexOf('value="9"')).toBeLessThan(html.indexOf('value="8"'));
    expect(html.indexOf('value="8"')).toBeLessThan(html.indexOf('value="4"'));
    expect(html).not.toContain('value="3"');
    expect(html).not.toContain('md:grid-cols-2');
    expect(html).not.toContain('md:col-span-2');
    expect(source).toContain("from '../ui/select'");
    expect(source).toContain("from '../ui/cold-code-editor'");
    expect(source).toContain("['2', 'WebHook', 'WebHook']");
    expect(source).toContain("['9', 'alert.notice.type.discord', 'Discord']");
    expect(source).toContain("['8', 'alert.notice.type.slack', 'Slack']");
    expect(source).not.toContain("['3', 'alert.notice.type.wechat'");
    expect(source).toContain('data-alert-notice-template-type-selector="cold-select"');
    expect(source).toContain('data-alert-notice-template-preset-view="readonly-type-pill"');
    expect(source).toContain("draft.preset ? resolveCopy(t, 'alert.notice.template.preset.true', '系统内置模版') : resolveCopy(t, 'alert.notice.template.preset.false', '用户自定义模版')");
    expect(source).toContain('data-alert-notice-template-code-editor="template-content"');
    expect(source).toContain('readOnly');
    expect(source).not.toContain("from '../workbench/primitives'");
    expect(source).not.toContain('AlertAuthoringTextarea');
    expect(source).not.toContain('EditorRow');
    expect(source).not.toContain('md:grid-cols-2');
    expect(source).not.toContain('md:col-span-2');
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
          content: '系统内置模板正文'
        }}
        onDraftChange={vi.fn()}
      />
    );

    expect(html).toContain('data-alert-notice-template-readonly="true"');
    expect(html).toContain('data-alert-notice-template-viewer-code-editor="readonly-code-editor"');
    expect(html).toContain('data-cold-code-editor-readonly="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-alert-notice-template-form-row="preset"');
    expect(html).toContain('系统内置模版');
    expect(html).toContain('系统内置模板正文');
  });
});
