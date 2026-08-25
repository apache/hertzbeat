/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { CopyOutlined, DownOutlined, FileTextOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import type { TFunction } from 'i18next';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  noticeTemplateBodyOffset,
  noticeTemplateMatches,
  noticeTemplatePreviewTokens,
  type NoticeTemplatePreviewToken
} from '../model/notice-template-preview-model';
import styles from './notice-template-preview.module.css';

type NoticeTemplatePreviewProps = {
  content: string;
};

type CopyState = 'idle' | 'copied' | 'error';

export function NoticeTemplatePreview({ content }: NoticeTemplatePreviewProps) {
  const { t } = useTranslation();
  const [queryState, setQueryState] = useState({ content, value: '' });
  const [activeMatchState, setActiveMatch] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState<{ content: string; state: CopyState }>({ content, state: 'idle' });
  const query = queryState.content === content ? queryState.value : '';
  const copyState = copyFeedback.content === content ? copyFeedback.state : 'idle';
  const bodyOffset = useMemo(() => noticeTemplateBodyOffset(content), [content]);
  const matches = useMemo(() => noticeTemplateMatches(content, query), [content, query]);
  const tokens = useMemo(
    () => noticeTemplatePreviewTokens(content.length, matches, bodyOffset),
    [bodyOffset, content.length, matches]
  );
  const bodyRef = useRef<HTMLSpanElement | null>(null);
  const matchRefs = useRef<Array<HTMLElement | null>>([]);
  const activeMatch = matches.length > 0 ? activeMatchState % matches.length : 0;
  const copyKey = previewCopyKey(copyState);

  const revealMatch = (index: number) => {
    if (matches.length === 0) return;
    const next = (index + matches.length) % matches.length;
    setActiveMatch(next);
    matchRefs.current[next]?.scrollIntoView({ block: 'center' });
  };

  return (
    <section className={styles.workspace} aria-label={t('noticeTemplates.previewSource')}>
      <PreviewToolbar
        activeMatch={activeMatch}
        bodyAvailable={bodyOffset != null}
        copyKey={copyKey}
        matchCount={matches.length}
        query={query}
        t={t}
        onBody={() => bodyRef.current?.scrollIntoView({ block: 'start' })}
        onCopy={() => void copyTemplateSource(content, state => setCopyFeedback({ content, state }))}
        onMatch={revealMatch}
        onQuery={value => {
          setQueryState({ content, value });
          setActiveMatch(0);
        }}
      />
      <PreviewSource
        activeMatch={activeMatch}
        bodyOffset={bodyOffset}
        bodyRef={bodyRef}
        content={content}
        registerMatch={(index, node) => {
          matchRefs.current[index] = node;
        }}
        tokens={tokens}
      />
    </section>
  );
}

type PreviewToolbarProps = {
  activeMatch: number;
  bodyAvailable: boolean;
  copyKey: string;
  matchCount: number;
  query: string;
  t: TFunction;
  onBody: () => void;
  onCopy: () => void;
  onMatch: (index: number) => void;
  onQuery: (value: string) => void;
};

function PreviewToolbar(props: PreviewToolbarProps) {
  const { activeMatch, bodyAvailable, copyKey, matchCount, query, t, onBody, onCopy, onMatch, onQuery } = props;
  return (
    <div className={styles.toolbar}>
      <Input
        className={styles.search}
        allowClear
        prefix={<SearchOutlined aria-hidden="true" />}
        aria-label={t('noticeTemplates.previewSearch')}
        placeholder={t('noticeTemplates.previewSearchPlaceholder')}
        value={query}
        onChange={event => onQuery(event.target.value)}
        onPressEnter={() => onMatch(activeMatch)}
      />
      <span className={styles.matchCount} aria-live="polite">
        {matchCount > 0
          ? t('noticeTemplates.previewMatchCount', { current: activeMatch + 1, total: matchCount })
          : t('noticeTemplates.previewNoMatches')}
      </span>
      <div className={styles.matchActions}>
        <Button
          size="small"
          type="text"
          aria-label={t('noticeTemplates.previewPreviousMatch')}
          disabled={matchCount === 0}
          icon={<UpOutlined aria-hidden="true" />}
          onClick={() => onMatch(activeMatch - 1)}
        />
        <Button
          size="small"
          type="text"
          aria-label={t('noticeTemplates.previewNextMatch')}
          disabled={matchCount === 0}
          icon={<DownOutlined aria-hidden="true" />}
          onClick={() => onMatch(activeMatch + 1)}
        />
      </div>
      <Button
        size="small"
        icon={<FileTextOutlined aria-hidden="true" />}
        disabled={!bodyAvailable}
        title={!bodyAvailable ? t('noticeTemplates.previewBodyUnavailable') : undefined}
        onClick={onBody}
      >
        {t('noticeTemplates.previewJumpToBody')}
      </Button>
      <Button size="small" icon={<CopyOutlined aria-hidden="true" />} aria-label={t(copyKey)} onClick={onCopy}>
        {t(copyKey)}
      </Button>
    </div>
  );
}

type PreviewSourceProps = {
  activeMatch: number;
  bodyOffset: number | null;
  bodyRef: React.RefObject<HTMLSpanElement | null>;
  content: string;
  registerMatch: (index: number, node: HTMLElement | null) => void;
  tokens: NoticeTemplatePreviewToken[];
};

function PreviewSource({ activeMatch, bodyOffset, bodyRef, content, registerMatch, tokens }: PreviewSourceProps) {
  return (
    <pre className={styles.source} tabIndex={0}>
      {tokens.map(token => (
        <PreviewSourceToken
          activeMatch={activeMatch}
          bodyOffset={bodyOffset}
          bodyRef={bodyRef}
          content={content}
          key={`${token.start}-${token.end}`}
          registerMatch={registerMatch}
          token={token}
        />
      ))}
    </pre>
  );
}

function PreviewSourceToken({
  activeMatch,
  bodyOffset,
  bodyRef,
  content,
  registerMatch,
  token
}: Omit<PreviewSourceProps, 'tokens'> & { token: NoticeTemplatePreviewToken }) {
  const text = content.slice(token.start, token.end);
  return (
    <span>
      {token.start === bodyOffset ? <span className={styles.bodyAnchor} ref={bodyRef} data-template-body="" /> : null}
      {token.matchIndex == null ? (
        text
      ) : (
        <mark
          className={token.matchIndex === activeMatch ? styles.activeMatch : styles.match}
          ref={node => {
            registerMatch(token.matchIndex ?? 0, node);
          }}
        >
          {text}
        </mark>
      )}
    </span>
  );
}

async function copyTemplateSource(content: string, setCopyState: (state: CopyState) => void) {
  try {
    await navigator.clipboard.writeText(content);
    setCopyState('copied');
  } catch {
    setCopyState('error');
  }
}

function previewCopyKey(state: CopyState) {
  if (state === 'copied') return 'noticeTemplates.previewCopied';
  if (state === 'error') return 'noticeTemplates.previewCopyFailed';
  return 'noticeTemplates.previewCopy';
}
