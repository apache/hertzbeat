/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type LabelDisplayIdentity = {
  name: string;
  tagValue?: string;
};

/** Preserves the label filter grammar accepted by the Monitor list API. */
export function buildLabelDisplayName(label: LabelDisplayIdentity) {
  const name = label.name.trim();
  const value = label.tagValue?.trim();
  return value ? `${name}:${value}` : name;
}
