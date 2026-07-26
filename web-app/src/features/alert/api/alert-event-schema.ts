/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { alertRecordStatuses } from '../model/alert-model';

const alertEventSignalSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(alertRecordStatuses)
});

export type AlertEventSignal = z.output<typeof alertEventSignalSchema>;

/** Drops alert bodies and labels at the SSE boundary before feature code sees them. */
export function parseAlertEventSignal(data: string): AlertEventSignal | null {
  try {
    const result = alertEventSignalSchema.safeParse(JSON.parse(data));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
