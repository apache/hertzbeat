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
import java.time.Duration;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAmount;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link SnowFlakeIdGenerator}
 */

class TimePeriodUtilTest {

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
