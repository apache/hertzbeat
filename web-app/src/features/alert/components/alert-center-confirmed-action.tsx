/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm } from 'antd';

type AlertCenterConfirmedActionProps = {
  confirm: string;
  confirmLabel: string;
  danger?: boolean;
  disabled: boolean;
  label: string;
  run: () => void | Promise<unknown>;
  type?: 'default' | 'link';
};

/** Centralizes confirmation semantics for destructive and status-changing alert actions. */
export function AlertCenterConfirmedAction({
  confirm,
  confirmLabel,
  danger = false,
  disabled,
  label,
  run,
  type = 'default'
}: AlertCenterConfirmedActionProps) {
  return (
    <Popconfirm
      title={confirm}
      okText={confirmLabel}
      disabled={disabled}
      okButtonProps={{ danger, disabled }}
      onConfirm={() => !disabled && void run()}
    >
      <Button size="small" type={type} danger={danger} disabled={disabled}>
        {label}
      </Button>
    </Popconfirm>
  );
}
