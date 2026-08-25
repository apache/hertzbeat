/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  noticeTemplateBodyOffset,
  noticeTemplateMatches,
  noticeTemplatePreviewTokens
} from '../model/notice-template-preview-model';
import { NoticeTemplatePreview } from './notice-template-preview';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const content = `/*
 * Licensed to the Apache Software Foundation (ASF)
 */

{{ define "email" }}
Alert: {{ .alertname }}
{{ end }}`;

describe('NoticeTemplatePreview', () => {
  const writeText = vi.fn();
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true });
  });
  afterEach(cleanup);

  it('preserves the exact raw source while identifying only a real leading comment as the body boundary', () => {
    const offset = noticeTemplateBodyOffset(content);

    expect(offset).toBe(content.indexOf('{{ define'));
    expect(content.slice(0, offset ?? 0)).toContain('Licensed to the Apache Software Foundation');
    expect(noticeTemplateBodyOffset('<!-- license -->\n<!DOCTYPE html>')).toBe('<!-- license -->\n'.length);
    expect(noticeTemplateBodyOffset('{{ define "plain" }}')).toBeNull();
  });

  it('keeps one search match highlighted when the body anchor splits its source range', () => {
    const bodyOffset = noticeTemplateBodyOffset(content);
    const matches = noticeTemplateMatches(content, '*/\n\n{{');
    const matchingTokens = noticeTemplatePreviewTokens(content.length, matches, bodyOffset).filter(
      token => token.matchIndex === 0
    );

    expect(matches).toHaveLength(1);
    expect(matchingTokens).toHaveLength(2);
  });

  it('copies the complete source and exposes searchable matches plus direct body navigation', async () => {
    const { container } = render(<NoticeTemplatePreview content={content} />);

    expect(container.querySelector('pre')?.textContent).toBe(content);
    fireEvent.change(screen.getByPlaceholderText('noticeTemplates.previewSearchPlaceholder'), {
      target: { value: 'alert' }
    });

    expect(container.querySelectorAll('mark')).toHaveLength(2);
    expect(screen.getByText('noticeTemplates.previewMatchCount')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'noticeTemplates.previewNextMatch' }));
    expect(scrollIntoView).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'noticeTemplates.previewJumpToBody' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'noticeTemplates.previewCopy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(content));
    expect(screen.getByRole('button', { name: 'noticeTemplates.previewCopied' })).toBeInTheDocument();
  });
});
