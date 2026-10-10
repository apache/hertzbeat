/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
