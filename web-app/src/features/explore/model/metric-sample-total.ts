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

// Every finite binary64 sample is an integer multiple of 2^-1074. Accumulating
// those integers avoids intermediate overflow and preserves cancellation residuals.
export function metricSampleTotal(values: number[], average: boolean): number {
  const binary = new DataView(new ArrayBuffer(8));
  let total = 0n;
  for (const value of values) {
    binary.setFloat64(0, value, false);
    const bits = binary.getBigUint64(0, false);
    const exponent = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & ((1n << 52n) - 1n);
    const magnitude = exponent === 0 ? fraction : ((1n << 52n) | fraction) << BigInt(exponent - 1);
    total += bits >> 63n ? -magnitude : magnitude;
  }
  return roundedBinary64(total, average ? BigInt(values.length) : 1n);
}

function roundedBinary64(total: bigint, divisor: bigint): number {
  if (total === 0n) return 0;
  const magnitude = total < 0n ? -total : total;
  // Keep 53 significant bits for normal values; subnormals use the 2^-1074 grid.
  let exponent = magnitude.toString(2).length - divisor.toString(2).length;
  if (exponent >= 0 && magnitude < divisor << BigInt(exponent)) exponent--;
  const shift = Math.max(0, exponent - 52);
  const denominator = divisor << BigInt(shift);
  let rounded = magnitude / denominator;
  const remainder = magnitude % denominator;
  if (remainder * 2n > denominator || (remainder * 2n === denominator && rounded % 2n !== 0n)) rounded++;
  // A nonzero exact result that rounds away is unavailable, never a measured zero.
  if (rounded === 0n) return NaN;
  const value = Number(rounded) * 2 ** (shift - 1074);
  return total < 0n ? -value : value;
}
