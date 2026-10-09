/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
