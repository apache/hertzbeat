/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Popover } from 'antd';
import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './hertzbeat-shell.module.css';
import { ShellNavigationLink } from './shell-navigation-link';
import type { ShellNavigationItem } from './shell-navigation-model';

type ShellNavigationFlyoutProps = {
  active: boolean;
  activeTrail: string[];
  item: ShellNavigationItem;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShellNavigationFlyout(props: ShellNavigationFlyoutProps) {
  const { active, activeTrail, item, label, open, onOpenChange } = props;
  const { closeAndRestoreFocus, flyoutId, flyoutRef, triggerRef } = useFlyoutInteraction(open, onOpenChange);
  const overlayClassName = styles.navigationFlyoutOverlay;
  return (
    <div className={styles.navigationBranch} data-depth="0">
      <Popover
        arrow={false}
        destroyOnHidden
        fresh
        open={open}
        placement="rightTop"
        transitionName=""
        trigger={[]}
        {...(overlayClassName ? { rootClassName: overlayClassName } : {})}
        content={
          <NavigationFlyoutPanel
            activeTrail={activeTrail}
            flyoutId={flyoutId}
            flyoutRef={flyoutRef}
            item={item}
            label={label}
            onClose={closeAndRestoreFocus}
          />
        }
      >
        <button
          ref={triggerRef}
          className={`${styles.navigationLink} ${active ? styles.navigationLinkActive : ''}`}
          type="button"
          title={label}
          aria-label={label}
          aria-controls={flyoutId}
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          onKeyDown={event => {
            if (event.key !== 'ArrowRight') return;
            event.preventDefault();
            onOpenChange(true);
          }}
        >
          <span className={styles.navigationIcon} aria-hidden="true">
            {item.icon}
          </span>
        </button>
      </Popover>
    </div>
  );
}

function useFlyoutInteraction(open: boolean, onOpenChange: (open: boolean) => void) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLElement>(null);
  const flyoutId = useId();

  useEffect(() => {
    if (!open) return;
    const flyout = flyoutRef.current;
    // Ant Popover hard-codes tooltip semantics; neutralize its wrapper so assistive technology sees nav/list/link.
    flyout?.closest('[role="tooltip"]')?.setAttribute('role', 'presentation');
    // Disclosure navigation then follows the browser's native Tab order after focus enters the first usable link.
    flyout?.querySelector<HTMLElement>('a:not([aria-disabled="true"])')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || flyoutRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onOpenChange, open]);

  return {
    closeAndRestoreFocus: () => {
      onOpenChange(false);
      triggerRef.current?.focus();
    },
    flyoutId,
    flyoutRef,
    triggerRef
  };
}

function NavigationFlyoutPanel({
  activeTrail,
  flyoutId,
  flyoutRef,
  item,
  label,
  onClose
}: {
  activeTrail: string[];
  flyoutId: string;
  flyoutRef: RefObject<HTMLElement | null>;
  item: ShellNavigationItem;
  label: string;
  onClose: () => void;
}) {
  return (
    <nav
      ref={flyoutRef}
      id={flyoutId}
      className={styles.navigationFlyout}
      aria-label={label}
      onKeyDown={event => handleFlyoutKeyDown(event, onClose)}
    >
      <div className={styles.navigationFlyoutTitle}>{label}</div>
      <ul className={styles.navigationFlyoutList}>
        {item.children.map(child => (
          <NavigationFlyoutBranch
            key={child.name}
            activeTrail={activeTrail}
            depth={0}
            item={child}
            onNavigate={onClose}
          />
        ))}
      </ul>
    </nav>
  );
}

function NavigationFlyoutBranch({
  activeTrail,
  depth,
  item,
  onNavigate
}: {
  activeTrail: string[];
  depth: number;
  item: ShellNavigationItem;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const label = t(item.labelKey);
  return (
    <li className={styles.navigationFlyoutBranch} data-depth={depth}>
      {item.route ? (
        <ShellNavigationLink
          active={activeTrail.at(-1) === item.name}
          collapsed={false}
          item={item}
          label={label}
          onNavigate={onNavigate}
        />
      ) : (
        <div className={styles.navigationFlyoutGroupLabel}>{label}</div>
      )}
      {item.children.length > 0 && (
        <ul className={styles.navigationFlyoutList} aria-label={label}>
          {item.children.map(child => (
            <NavigationFlyoutBranch
              key={child.name}
              activeTrail={activeTrail}
              depth={depth + 1}
              item={child}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function handleFlyoutKeyDown(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  close();
}
