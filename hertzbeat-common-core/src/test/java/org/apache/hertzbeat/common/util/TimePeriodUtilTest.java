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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Duration;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAmount;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Test cases for {@link TimePeriodUtil}.
 */

class TimePeriodUtilTest {

    @ParameterizedTest
    @MethodSource("decimalTimestamps")
    void testDecimalTimestampPrecision(Object timestamp, long expected) {
        assertEquals(expected, TimePeriodUtil.normalizeToMilliseconds(timestamp));
    }

    static Stream<Arguments> decimalTimestamps() {
        return Stream.of(
                Arguments.of("1.001", 1001L),
                Arguments.of(1.001d, 1001L),
                Arguments.of(1.001f, 1001L),
                Arguments.of("-1.001", -1001L),
                Arguments.of(-1.001d, -1001L),
                Arguments.of(-1.001f, -1001L),
                Arguments.of(new BigDecimal("1672531199.123"), 1672531199123L),
                Arguments.of(new BigDecimal("1672531199.000"), 1672531199000L),
                Arguments.of(new BigDecimal("1E+10"), 10000000000000L),
                Arguments.of("1.001e0", 1001L),
                Arguments.of("1001e-3", 1001L),
                Arguments.of("1E3", 1000000L),
                Arguments.of("1.0019", 1001L),
                Arguments.of("-1.0019", -1001L),
                Arguments.of("0.0009", 0L),
                Arguments.of("-0.0009", 0L),
                Arguments.of("9007199254740.993", 9007199254740993L),
                Arguments.of("9223372036854775.807", Long.MAX_VALUE),
                Arguments.of("-9223372036854775.808", Long.MIN_VALUE)
        );
    }

    @ParameterizedTest
    @MethodSource("integerTimestamps")
    void testIntegerTimestampUnitDetection(Object timestamp, long expected) {
        assertEquals(expected, TimePeriodUtil.normalizeToMilliseconds(timestamp));
    }

    static Stream<Arguments> integerTimestamps() {
        return Stream.of(
                Arguments.of(0, 0L),
                Arguments.of((byte) 1, 1000L),
                Arguments.of((short) 1, 1000L),
                Arguments.of(1672531199, 1672531199000L),
                Arguments.of(1672531199L, 1672531199000L),
                Arguments.of("1672531199", 1672531199000L),
                Arguments.of(new BigInteger("1672531199"), 1672531199000L),
                Arguments.of(1672531199000L, 1672531199000L),
                Arguments.of("1672531199000", 1672531199000L),
                Arguments.of(new BigInteger("1672531199000"), 1672531199000L),
                Arguments.of(-1672531199L, -1672531199000L),
                Arguments.of("-1672531199", -1672531199000L),
                Arguments.of(-1672531199000L, -1672531199000L),
                Arguments.of(9999999999L, 9999999999000L),
                Arguments.of(-9999999999L, -9999999999000L),
                Arguments.of(10000000000L, 10000000000L),
                Arguments.of(-10000000000L, -10000000000L),
                Arguments.of(Long.MAX_VALUE, Long.MAX_VALUE),
                Arguments.of(Long.MIN_VALUE, Long.MIN_VALUE)
        );
    }

    @ParameterizedTest
    @MethodSource("invalidTimestamps")
    void testRejectInvalidTimestamps(Object timestamp) {
        assertThrows(IllegalArgumentException.class, () -> TimePeriodUtil.normalizeToMilliseconds(timestamp));
    }

    static Stream<Arguments> invalidTimestamps() {
        return Stream.of(
                Arguments.of((Object) null),
                Arguments.of(new Object()),
                Arguments.of(""),
                Arguments.of("invalid"),
                Arguments.of("NaN"),
                Arguments.of("Infinity"),
                Arguments.of("-Infinity"),
                Arguments.of(Double.NaN),
                Arguments.of(Double.POSITIVE_INFINITY),
                Arguments.of(Double.NEGATIVE_INFINITY),
                Arguments.of(Float.NaN),
                Arguments.of(Float.POSITIVE_INFINITY),
                Arguments.of(Float.NEGATIVE_INFINITY)
        );
    }

    @ParameterizedTest
    @MethodSource("overflowTimestamps")
    void testRejectTimestampOverflow(Object timestamp) {
        assertThrows(IllegalArgumentException.class, () -> TimePeriodUtil.normalizeToMilliseconds(timestamp));
    }

    static Stream<Arguments> overflowTimestamps() {
        return Stream.of(
                Arguments.of("9223372036854775.808"),
                Arguments.of("-9223372036854775.809"),
                Arguments.of(new BigDecimal("9223372036854775.808")),
                Arguments.of(new BigInteger("9223372036854775808")),
                Arguments.of(new BigInteger("-9223372036854775809")),
                Arguments.of(Double.MAX_VALUE),
                Arguments.of(-Double.MAX_VALUE),
                Arguments.of(Float.MAX_VALUE)
        );
    }

    @Test
    void testNormalizeToSeconds() {
        assertEquals(1672531199L, TimePeriodUtil.normalizeToSeconds("1672531199.123"));
        assertEquals(1672531199L, TimePeriodUtil.normalizeToSeconds(1672531199123L));
        assertEquals(-1672531199L, TimePeriodUtil.normalizeToSeconds(-1672531199L));
        assertEquals(1L, TimePeriodUtil.normalizeToSeconds("1.999"));
        assertEquals(-1L, TimePeriodUtil.normalizeToSeconds("-1.999"));
    }

    @Test
    void testEveryMillisecondWithinSecond() {
        // Check the entire millisecond range at both epoch and contemporary timestamps.
        for (long seconds : new long[] {1L, 1672531199L}) {
            for (int millis = 0; millis < 1000; millis++) {
                long expected = seconds * 1000 + millis;
                BigDecimal timestamp = BigDecimal.valueOf(expected, 3);
                assertEquals(expected, TimePeriodUtil.normalizeToMilliseconds(timestamp.toPlainString()));
                assertEquals(expected, TimePeriodUtil.normalizeToMilliseconds(timestamp.doubleValue()));
                assertEquals(expected, TimePeriodUtil.normalizeToMilliseconds(timestamp));
                assertEquals(-expected, TimePeriodUtil.normalizeToMilliseconds(timestamp.negate()));
            }
        }
    }

    @Test
    void testParseTokenTime() {

        // Years
        TemporalAmount result = TimePeriodUtil.parseTokenTime("1Y");
        assertTrue(result instanceof Period);
        assertEquals(Period.ofYears(1), result);

        // Month
        result = TimePeriodUtil.parseTokenTime("5M");
        assertTrue(result instanceof Period);
        assertEquals(Period.ofMonths(5), result);

        // Day
        result = TimePeriodUtil.parseTokenTime("3D");
        assertTrue(result instanceof Period);
        assertEquals(Period.ofDays(3), result);

        // Week
        result = TimePeriodUtil.parseTokenTime("3W");
        assertTrue(result instanceof Period);
        assertEquals(Period.ofWeeks(3), result);
    }

    @Test
    void testParseTokenTimeDuration() {

        // Minute
        TemporalAmount result = TimePeriodUtil.parseTokenTime("30m");
        assertTrue(result instanceof Duration);
        assertEquals(Duration.ofMinutes(30), result);

        // Hour
        result = TimePeriodUtil.parseTokenTime("2h");
        assertTrue(result instanceof Duration);
        assertEquals(Duration.ofHours(2), result);
    }

    @Test
    void testParseTokenTimeLowerCaseMinute() {
        // Lowercase Minute
        TemporalAmount result = TimePeriodUtil.parseTokenTime("1m");
        assertTrue(result instanceof Duration);
        assertEquals(Duration.ofMinutes(1), result);
    }

    @Test
    void testParseTokenTimeInvalidInput() {

        // null input
        TemporalAmount result = TimePeriodUtil.parseTokenTime(null);
        assertNull(result);

        // empty string
        result = TimePeriodUtil.parseTokenTime("");
        assertNull(result);

        // string with length < 2
        result = TimePeriodUtil.parseTokenTime("1");
        assertNull(result);

        // invalid format (non-numeric)
        Exception exception = assertThrows(DateTimeParseException.class, () -> TimePeriodUtil.parseTokenTime("abc"));
        assertNotNull(exception.getMessage());
    }

}
