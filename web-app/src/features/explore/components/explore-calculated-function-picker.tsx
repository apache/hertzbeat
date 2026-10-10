/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useState, type KeyboardEvent } from 'react';
import { Button, Input, Menu, Popover, type InputRef, type MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import { calculatedFunctions, type CalculatedFunction } from '../model/explore-calculated-function-catalog';
import styles from './explore-log-transaction-editor.module.css';

export function ExploreCalculatedFunctionPicker({ t, insert }: { t: TFunction; insert: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<InputRef>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const closeOnEscape = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const choose = (name: string) => {
    insert(name);
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      afterOpenChange={visible => {
        if (visible) searchRef.current?.focus();
      }}
      placement="bottomLeft"
      trigger="click"
      content={<FunctionPickerContent t={t} choose={choose} close={closeOnEscape} searchRef={searchRef} />}
    >
      <Button
        ref={triggerRef}
        aria-label={t('explore.logCalculatedV2.functions')}
        onClick={() => setOpen(!open)}
        onKeyDown={event => {
          if (open && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeOnEscape();
          }
        }}
      >
        Σ
      </Button>
    </Popover>
  );
}

function FunctionPickerContent({
  t,
  choose,
  close,
  searchRef
}: {
  t: TFunction;
  choose: (name: string) => void;
  close: () => void;
  searchRef: { current: InputRef | null };
}) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<string>();
  const menuHost = useRef<HTMLDivElement>(null);
  const matching = calculatedFunctions.filter(item =>
    `${item.name} ${item.signature} ${t(`explore.logCalculatedV2.functionDescriptions.${item.name}`)}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const selected = matching.find(item => item.name === active) ?? matching[0];
  const menuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };
  return (
    <div className={styles.functionPicker}>
      <FunctionSearch t={t} value={search} change={setSearch} close={close} searchRef={searchRef} menuHost={menuHost} />
      <div className={styles.functionBody}>
        <div
          ref={menuHost}
          className={styles.functionMenu}
          onKeyDown={menuKeyDown}
          onFocusCapture={event => {
            const name = (event.target as HTMLElement).closest('[role="menuitem"]')?.textContent?.trim();
            if (name) setActive(name);
          }}
        >
          <Menu
            selectable={false}
            items={functionItems(matching, t, setActive)}
            onClick={({ key, domEvent }) => {
              domEvent.preventDefault();
              choose(key);
            }}
          />
        </div>
        {selected && <FunctionDetail item={selected} t={t} />}
      </div>
      <small>{t('explore.logCalculatedV2.functionKeyboardHint')}</small>
    </div>
  );
}

function FunctionSearch({
  t,
  value,
  change,
  close,
  searchRef,
  menuHost
}: {
  t: TFunction;
  value: string;
  change: (value: string) => void;
  close: () => void;
  searchRef: { current: InputRef | null };
  menuHost: { current: HTMLDivElement | null };
}) {
  return (
    <Input
      ref={searchRef}
      aria-label={t('explore.logCalculatedV2.searchFunctions')}
      placeholder={t('explore.logCalculatedV2.searchFunctions')}
      value={value}
      onChange={event => change(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
        if (event.key === 'ArrowDown')
          menuHost.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
      }}
    />
  );
}

function functionItems(
  matching: CalculatedFunction[],
  t: TFunction,
  setActive: (name: string) => void
): NonNullable<MenuProps['items']> {
  return (['arithmetic', 'string', 'logical'] as const)
    .filter(category => matching.some(item => item.category === category))
    .map(category => ({
      type: 'group',
      label: t(`explore.logCalculatedV2.functionCategories.${category}`),
      children: matching
        .filter(item => item.category === category)
        .map(item => ({
          key: item.name,
          label: (
            <span onMouseEnter={() => setActive(item.name)} onFocus={() => setActive(item.name)}>
              {item.name}
            </span>
          ),
          disabled: !item.supported
        }))
    }));
}

function FunctionDetail({ item, t }: { item: CalculatedFunction; t: TFunction }) {
  return (
    <div className={styles.functionDetail} aria-live="polite">
      <strong>{item.signature}</strong>
      <p>{t(`explore.logCalculatedV2.functionDescriptions.${item.name}`)}</p>
      <code>{item.example}</code>
      {!item.supported && <p>{t('explore.logCalculatedV2.functionUnavailable')}</p>}
    </div>
  );
}
