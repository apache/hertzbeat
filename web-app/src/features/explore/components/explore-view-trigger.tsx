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

import { forwardRef, type ComponentProps } from 'react';
import { Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import styles from './explore-view-trigger.module.css';

export const ExploreViewTrigger = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  function ExploreViewTrigger({ children, className, ...props }, ref) {
    return (
      <Button
        {...props}
        ref={ref}
        type="text"
        className={[styles.trigger, className].filter(Boolean).join(' ')}
        data-signal-view-trigger
      >
        <span className={styles.label}>{children}</span>
        <DownOutlined aria-hidden data-signal-view-arrow />
      </Button>
    );
  }
);
