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

package org.apache.hertzbeat.collector.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

/**
 * test for TimeExpressionUtil
 */
class TimeExpressionUtilTest {


    LocalDateTime now = LocalDateTime.of(2022, 4, 24, 2, 40, 0);

    @Test
    void testBlankTemplate() {
        assertEquals("", TimeExpressionUtil.calculate("", LocalDateTime.now()));
        assertNull(TimeExpressionUtil.calculate(null, LocalDateTime.now()));
    }

    @Test
    void testErrorTemplate() {
        assertEquals("hello", TimeExpressionUtil.calculate("hello", LocalDateTime.now()));
        assertEquals("${}", TimeExpressionUtil.calculate("${}", LocalDateTime.now()));
        assertEquals("${@current-24m}", TimeExpressionUtil.calculate("${@current-24m}", LocalDateTime.now()));
    }

    @Test
    void testWithSpace() {
        assertEquals("2022-04-24 02:40:01", TimeExpressionUtil.calculate("${@now + 1s}", now));
    }

    @Test
    void testCalculate() {
        assertEquals("2022-04-24 02:40:00", TimeExpressionUtil.calculate("${@now}", now));
        assertEquals("2022-04-24", TimeExpressionUtil.calculate("${@date}", now));
        assertEquals("02:40:00", TimeExpressionUtil.calculate("${@time}", now));
        assertEquals("1650768000000", TimeExpressionUtil.calculate("${@timestamp}", now));
        assertEquals("1650768000", TimeExpressionUtil.calculate("${@timestamp10}", now));
        assertEquals("2022", TimeExpressionUtil.calculate("${@year}", now));
        assertEquals("04", TimeExpressionUtil.calculate("${@month}", now));
        assertEquals("24", TimeExpressionUtil.calculate("${@day}", now));
        assertEquals("02", TimeExpressionUtil.calculate("${@hour}", now));
        assertEquals("40", TimeExpressionUtil.calculate("${@minute}", now));
        assertEquals("00", TimeExpressionUtil.calculate("${@second}", now));
        assertEquals("000", TimeExpressionUtil.calculate("${@millisecond}", now));

        assertEquals("2022-04-24 02:25:00", TimeExpressionUtil.calculate("${@now-15m}", now));
        assertEquals("2022-05-01 02:40:00", TimeExpressionUtil.calculate("${@now+1w}", now));
        assertEquals("2022-05-01 02:25:00", TimeExpressionUtil.calculate("${@now+1w-15m}", now));
        assertEquals("2022-04-25 02:40:00", TimeExpressionUtil.calculate("${@now+1d}", now));
        assertEquals("02:40:00", TimeExpressionUtil.calculate("${@time+1d}", now));
        assertEquals("2023-04-24 02:40:00", TimeExpressionUtil.calculate("${@now+1y}", now));
    }

    @Test
    void testComplexTemplate() {
        assertEquals("Three days after 2022-04-24 , is 2022-04-27", TimeExpressionUtil.calculate("Three days after ${@date} , is ${@date+3d}", now));
        assertEquals("2022年04月24日 02:40:00", TimeExpressionUtil.calculate("${@year}年${@month}月${@day}日 ${@time}", now));
    }
}
