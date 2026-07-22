/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Typography } from 'antd';

import styles from './otlp-attribute-list.module.css';

type AttributeMap = Record<string, unknown> | Record<string, string>;

export function OtlpAttributeSection({ title, value }: { title: string; value?: AttributeMap | undefined }) {
  return (
    <section className={styles.section}>
      <Typography.Title level={5}>{title}</Typography.Title>
      <OtlpAttributeList value={value} />
    </section>
  );
}

export function OtlpAttributeList({ value }: { value?: AttributeMap | undefined }) {
  const entries = Object.entries(value ?? {});
  if (entries.length === 0) return <span>—</span>;
  return (
    <dl className={styles.list}>
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{formatAttributeValue(item)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatAttributeValue(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
