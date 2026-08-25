/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type AlertGroupDurationUnit = 'seconds' | 'minutes' | 'hours';

const secondsPerUnit: Record<AlertGroupDurationUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3_600
};

/** Uses the largest exact unit so persisted seconds are never hidden by rounding. */
export function preferredDurationUnit(seconds: number): AlertGroupDurationUnit {
  if (seconds > 0 && seconds % secondsPerUnit.hours === 0) return 'hours';
  if (seconds > 0 && seconds % secondsPerUnit.minutes === 0) return 'minutes';
  return 'seconds';
}

export function durationFromSeconds(seconds: number, unit: AlertGroupDurationUnit) {
  const value = seconds / secondsPerUnit[unit];
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

export function durationToSeconds(value: number, unit: AlertGroupDurationUnit) {
  return Math.max(0, Math.round(value * secondsPerUnit[unit]));
}
