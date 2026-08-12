/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
