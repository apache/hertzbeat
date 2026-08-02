/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ArrowRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export function DashboardStartLink(props: { label: string; onNavigate: () => void; target: string }) {
  return (
    <Button
      type="link"
      href={props.target}
      aria-label={props.label}
      icon={<ArrowRightOutlined />}
      iconPosition="end"
      onClick={event => {
        event.preventDefault();
        props.onNavigate();
      }}
    >
      {props.label}
    </Button>
  );
}
