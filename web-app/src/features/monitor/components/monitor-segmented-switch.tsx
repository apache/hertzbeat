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

import { Segmented } from 'antd';

import styles from './monitor-segmented-switch.module.css';

type MonitorSegmentedSwitchProps<Value extends string> = {
  label: string;
  value: Value;
  options: Array<{ label: string; value: Value }>;
  disabled?: boolean;
  size?: 'middle' | 'small';
  onChange: (value: Value) => void;
};

export function MonitorSegmentedSwitch<Value extends string>({
  label,
  value,
  options,
  disabled = false,
  size = 'middle',
  onChange
}: MonitorSegmentedSwitchProps<Value>) {
  return (
    <Segmented<Value>
      aria-label={label}
      className={styles.switch}
      value={value}
      options={options}
      disabled={disabled}
      size={size}
      onChange={onChange}
    />
  );
}
