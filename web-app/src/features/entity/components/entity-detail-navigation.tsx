/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Affix, Button } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './entity-detail-navigation.module.css';
import { focusEntityDetailChapter } from './entity-detail-focus';

export type EntityDetailChapter = { id: string; label: string };

export function EntityDetailSection({ id, label, children }: PropsWithChildren<{ id: string; label: string }>) {
  return (
    <div id={id} role="group" aria-label={label} tabIndex={-1} className={styles.chapter}>
      {children}
    </div>
  );
}

export function EntityDetailNavigation({ chapters }: { chapters: readonly EntityDetailChapter[] }) {
  const { t } = useTranslation();
  const { bindRoot, current, offset, activate, onAffixChange } = useChapterNavigation(chapters);
  // Mount Affix with the inherited shell offset before its first position measurement.
  return (
    <div ref={bindRoot}>
      {offset == null ? (
        <div className={styles.navigation} aria-hidden="true" />
      ) : (
        <Affix offsetTop={offset} onChange={onAffixChange}>
          <nav aria-label={t('entity.sections.details')} className={styles.navigation} data-entity-detail-navigation="">
            {chapters.map(chapter => (
              <Button
                key={chapter.id}
                type="text"
                aria-controls={chapter.id}
                aria-current={current === chapter.id ? 'location' : undefined}
                onClick={() => activate(chapter.id)}
              >
                {t(chapter.label)}
              </Button>
            ))}
          </nav>
        </Affix>
      )}
    </div>
  );
}

function useChapterNavigation(chapters: readonly EntityDetailChapter[]) {
  const root = useRef<HTMLDivElement | null>(null);
  const activated = useRef<string | undefined>(undefined);
  const [current, setCurrent] = useState(chapters[0]?.id);
  const [offset, setOffset] = useState<number>();
  const [affixed, setAffixed] = useState(false);
  const bindRoot = useCallback((node: HTMLDivElement | null) => {
    root.current = node;
    requestAnimationFrame(() => {
      if (node && root.current === node) {
        setOffset(Number.parseFloat(getComputedStyle(node).getPropertyValue('--hb-shell-header-height')) || 0);
      }
    });
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (root.current?.querySelector('nav')?.getBoundingClientRect().bottom ?? 0) + 24;
      const targets = chapters.map(chapter => ({
        ...chapter,
        top: document.getElementById(chapter.id)?.getBoundingClientRect().top
      }));
      const chosen = targets.find(chapter => chapter.id === activated.current);
      // Near the document end an activated heading may remain below the reading line.
      if (chosen?.top != null && chosen.top >= line && chosen.top < window.innerHeight) return;
      activated.current = undefined;
      const above = targets.filter(chapter => chapter.top != null && chapter.top <= line);
      setCurrent(above.at(-1)?.id ?? chapters[0]?.id);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    // Affix changes position after the scroll event. Read the settled directory geometry as well.
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [chapters, offset, affixed]);
  const activate = (id: string) => {
    activated.current = id;
    focusEntityDetailChapter(id);
    setCurrent(id);
  };
  return { bindRoot, current, offset, activate, onAffixChange: (value?: boolean) => setAffixed(value === true) };
}
