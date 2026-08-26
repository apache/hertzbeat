/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export function compareLocaleCatalogShape(reference: unknown, candidate: unknown) {
  const differences: string[] = [];
  compareNode(reference, candidate, '', differences);
  return differences.sort();
}

function compareNode(reference: unknown, candidate: unknown, path: string, differences: string[]) {
  const referenceKind = nodeKind(reference);
  const candidateKind = nodeKind(candidate);
  if (referenceKind !== candidateKind) {
    differences.push(`type:${path}:${referenceKind}/${candidateKind}`);
    return;
  }
  if (referenceKind !== 'object') return;
  const referenceRecord = reference as Record<string, unknown>;
  const candidateRecord = candidate as Record<string, unknown>;
  const keys = new Set([...Object.keys(referenceRecord), ...Object.keys(candidateRecord)]);
  for (const key of [...keys].sort()) {
    const childPath = path ? `${path}.${key}` : key;
    if (!Object.hasOwn(candidateRecord, key)) collectLeaves(referenceRecord[key], childPath, 'missing', differences);
    else if (!Object.hasOwn(referenceRecord, key)) collectLeaves(candidateRecord[key], childPath, 'extra', differences);
    else compareNode(referenceRecord[key], candidateRecord[key], childPath, differences);
  }
}

function collectLeaves(value: unknown, path: string, difference: 'extra' | 'missing', differences: string[]) {
  if (nodeKind(value) !== 'object') {
    differences.push(`${difference}:${path}`);
    return;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) differences.push(`${difference}:${path}`);
  for (const [key, child] of entries) collectLeaves(child, `${path}.${key}`, difference, differences);
}

function nodeKind(value: unknown) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}
