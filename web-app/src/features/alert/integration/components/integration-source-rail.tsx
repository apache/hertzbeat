/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TFunction } from 'i18next';

import type { AlertIntegrationSource, AlertIntegrationSourceId } from '../model/alert-integration-model';
import styles from './integration.module.css';

export function IntegrationSourceRail(props: {
  sources: readonly AlertIntegrationSource[];
  selected: AlertIntegrationSourceId;
  t: TFunction;
  onSelect: (source: AlertIntegrationSourceId) => void;
}) {
  return (
    <nav className={styles.rail} aria-label={props.t('alertIntegrations.sourcesLabel')}>
      {props.sources.map(source => (
        <button
          key={source.id}
          type="button"
          className={source.id === props.selected ? styles.sourceSelected : styles.source}
          aria-pressed={source.id === props.selected}
          onClick={() => props.onSelect(source.id)}
        >
          <img src={source.iconPath} alt="" aria-hidden="true" />
          <span>{props.t(source.nameKey)}</span>
        </button>
      ))}
    </nav>
  );
}
