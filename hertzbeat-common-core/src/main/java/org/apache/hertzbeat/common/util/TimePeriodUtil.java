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

package org.apache.hertzbeat.common.util;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Period;
import java.time.temporal.TemporalAmount;
import lombok.extern.slf4j.Slf4j;

/**
 * time util
 */
@Slf4j
public final class TimePeriodUtil {

    private TimePeriodUtil() {
    }

    /**
     * parse tokenTime to TemporalAmount
     * @param tokenTime eg: "1m", "5M", "3D", "30m", "2h", "1Y", "3W"
     * @return TemporalAmount
     */
    public static TemporalAmount parseTokenTime(String tokenTime) {

        if (tokenTime == null || tokenTime.length() < 2) {
            log.error("tokenTime is invalid");
            return null;
        }

        if (Character.isUpperCase(tokenTime.charAt(tokenTime.length() - 1))) {
            return Period.parse("P" + tokenTime);
        } else {
            return Duration.parse("PT" + tokenTime);
        }
    }

    /**
     * Normalize a timestamp to milliseconds. Integral values with at most ten magnitude
     * digits are seconds; larger integral values are milliseconds. Decimal values,
     * including floating-point numbers and exponent-form strings, are always seconds.
     * Sub-millisecond fractions are truncated toward zero.
     *
     * @param timestamp a numeric timestamp or its string representation
     * @return milliseconds
     * @throws IllegalArgumentException if the timestamp is null, invalid, non-finite,
     *                                  or outside the range of a long
     */
    public static long normalizeToMilliseconds(Object timestamp) {
        if (timestamp == null) {
            throw new IllegalArgumentException("Timestamp must not be null");
        }
        try {
            if (timestamp instanceof String timestampStr) {
                if (timestampStr.contains(".") || timestampStr.contains("e") || timestampStr.contains("E")) {
                    return decimalSecondsToMilliseconds(new BigDecimal(timestampStr));
                }
                return convertNumericTimestamp(Long.parseLong(timestampStr));
            }
            if (timestamp instanceof BigDecimal decimal) {
                return decimalSecondsToMilliseconds(decimal);
            }
            if (timestamp instanceof Double || timestamp instanceof Float) {
                // Use the decimal representation to avoid rounding millisecond boundaries
                // during binary floating-point multiplication (for example, 1.001 * 1000).
                return decimalSecondsToMilliseconds(new BigDecimal(timestamp.toString()));
            }
            if (timestamp instanceof BigInteger integer) {
                return convertNumericTimestamp(integer.longValueExact());
            }
            if (timestamp instanceof Number number) {
                return convertNumericTimestamp(number.longValue());
            }
        } catch (ArithmeticException | NumberFormatException e) {
            throw new IllegalArgumentException("Timestamp is invalid or outside the millisecond range: " + timestamp, e);
        }
        throw new IllegalArgumentException("Not support this timestamp type: " + timestamp.getClass().getName());
    }

    private static long decimalSecondsToMilliseconds(BigDecimal seconds) {
        return seconds.movePointRight(3).setScale(0, RoundingMode.DOWN).longValueExact();
    }

    /**
     * transform any timestamp to seconds
     * @param timestamp timestamp
     * @return seconds
     */
    public static long normalizeToSeconds(Object timestamp) {
        return normalizeToMilliseconds(timestamp) / 1000;
    }

    private static long convertNumericTimestamp(long numericTimestamp) {
        // The sign is not a digit; avoid abs() because Long.MIN_VALUE cannot be negated.
        if (numericTimestamp > -10_000_000_000L && numericTimestamp < 10_000_000_000L) {
            return numericTimestamp * 1000;
        } else {
            return numericTimestamp;
        }
    }
}
