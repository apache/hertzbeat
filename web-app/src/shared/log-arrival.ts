/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export const LOG_ARRIVAL_DURATION = 400;
export type LogArrival = { receivedAt: number; claimed: boolean };
// Event objects already provide identity for live records without a server UID.
// Weak keys release metadata when the bounded live buffer evicts its records.
const arrivals = new WeakMap<object, LogArrival>();

export function markLogArrival(row: object, receivedAt = Date.now()) {
  if (!arrivals.has(row)) arrivals.set(row, { receivedAt, claimed: false });
}
export function linkLogArrival(source: object, mapped: object) {
  const arrival = arrivals.get(source);
  if (arrival) arrivals.set(mapped, arrival);
}
export function logArrival(row: object | undefined) {
  return row ? arrivals.get(row) : undefined;
}
export function claimLogArrival(arrival: LogArrival | undefined, now = Date.now()) {
  if (!arrival || arrival.claimed) return undefined;
  arrival.claimed = true;
  const elapsed = now - arrival.receivedAt;
  return elapsed >= 0 && elapsed < LOG_ARRIVAL_DURATION ? elapsed : undefined;
}
