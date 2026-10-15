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

import { EllipsisOutlined } from '@ant-design/icons';
import { Dropdown, type MenuProps } from 'antd';
import type { RefObject } from 'react';
import styles from './explore-log-inspector-fields.module.css';

export function LogFieldDropdown({
  open,
  onOpenChange,
  trigger,
  items,
  actionLabel
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: RefObject<HTMLButtonElement>;
  items: MenuProps['items'];
  actionLabel: string;
}) {
  return (
    <Dropdown
      trigger={['click']}
      open={open}
      onOpenChange={(nextOpen, info) => {
        // Menu actions own dismissal so rejected analysis retains its recovery surface.
        if (info.source === 'trigger') onOpenChange(nextOpen);
      }}
      autoFocus
      destroyOnHidden
      menu={{
        ...(items === undefined ? {} : { items }),
        'aria-label': actionLabel,
        onClick: ({ key }) => {
          if (!key.startsWith('analysis-')) onOpenChange(false);
        },
        onKeyDown: event => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onOpenChange(false);
            trigger.current?.focus();
          }
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={styles.fieldMenu}
        aria-label={actionLabel}
      >
        <EllipsisOutlined aria-hidden="true" />
      </button>
    </Dropdown>
  );
}
