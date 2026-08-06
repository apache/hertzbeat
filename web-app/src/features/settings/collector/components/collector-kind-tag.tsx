/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { classifyCollectorKind, type CollectorKind } from '../model/collector-kind-model';
import type { CollectorRecord } from '../model/collector-model';

const kindColors: Record<CollectorKind, string> = {
  embedded_java: 'blue',
  java: 'default',
  hybrid: 'purple'
};

export function CollectorKindTag({ record }: { record: CollectorRecord }) {
  const { t } = useTranslation();
  const kind = classifyCollectorKind(record);
  return <Tag color={kindColors[kind]}>{t(`collectors.kind.${kind}`)}</Tag>;
}
