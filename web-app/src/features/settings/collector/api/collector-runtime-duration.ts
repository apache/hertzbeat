/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export function managedRuntimeDurationSeconds(value: string) {
  // Accept only the managed-runtime contract's whole-second PT…M…S subset; NaN lets Zod fail closed.
  const match = /^PT(?:(\d+)M)?(?:(\d+)S)?$/u.exec(value);
  if (!match || (!match[1] && !match[2])) return Number.NaN;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}
