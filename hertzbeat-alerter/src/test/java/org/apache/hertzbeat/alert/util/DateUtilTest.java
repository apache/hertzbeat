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

package org.apache.hertzbeat.alert.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link DateUtil}
 */
class DateUtilTest {

    @Test
    void getTimeStampFromSomeFormats() {
        String date = "2024-05-13";
        Optional<Long> actualTimestamp = DateUtil.getTimeStampFromSomeFormats(date);
        assertFalse(actualTimestamp.isPresent());

        date = "2024-05-13T12:34:56.789Z";
        actualTimestamp = DateUtil.getTimeStampFromSomeFormats(date);
        assertTrue(actualTimestamp.isPresent());
        assertEquals(1715603696789L, actualTimestamp.get());

        date = "2023-02-22T07:27:15.404000000Z";
        actualTimestamp = DateUtil.getTimeStampFromSomeFormats(date);
        assertTrue(actualTimestamp.isPresent());
        assertEquals(1677050835404L, actualTimestamp.get());
    }

    @Test
    void getTimeStampFromFormat() {
        String date = "2024-05-13 10:30:00";
        String format = "yyyy-MM-dd HH:mm:ss";
        Optional<Long> actualTimestamp = DateUtil.getTimeStampFromFormat(date, format);
        assertTrue(actualTimestamp.isPresent());
        assertEquals(1715596200000L, actualTimestamp.get());

        date = "2024-05-13";
        format = "yyyy-MM-dd HH:mm:ss.SSS";
        actualTimestamp = DateUtil.getTimeStampFromFormat(date, format);
        assertFalse(actualTimestamp.isPresent());
    }

    @Test
    void getZonedTimeStampFromFormat() {
        String dataStr = "2025/06/02 22:56:15 GMT+08:00";
        Long time = DateUtil.getZonedTimeStampFromFormat(dataStr, "yyyy/MM/dd HH:mm:ss 'GMT'XXX");
        assertNotNull(time);
        assertEquals(1748876175000L, time);
    }

}
