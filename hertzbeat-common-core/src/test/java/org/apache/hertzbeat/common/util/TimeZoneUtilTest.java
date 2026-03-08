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
import java.util.Locale;
import java.util.TimeZone;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test case for {@link TimeZoneUtil}
 */

class TimeZoneUtilTest {

    private TimeZone defaultTimeZone;
    private Locale defaultLocale;

    @BeforeEach
    void setUp() {

        defaultTimeZone = TimeZone.getDefault();
        defaultLocale = Locale.getDefault();
    }

    @AfterEach
    void tearDown() {

        TimeZone.setDefault(defaultTimeZone);
        Locale.setDefault(defaultLocale);
    }

    @Test
    void testSetTimeZoneAndLocale() {

        TimeZoneUtil.setTimeZoneAndLocale("America/New_York", "en_US");
        assertEquals("America/New_York", TimeZone.getDefault().getID());
        assertEquals(new Locale("en", "US"), Locale.getDefault());
    }

    @Test
    void testSetTimeZone() {

        TimeZoneUtil.setTimeZone("Asia/Tokyo");
        assertEquals("Asia/Tokyo", TimeZone.getDefault().getID());


        TimeZoneUtil.setTimeZone("");
        assertEquals("Asia/Tokyo", TimeZone.getDefault().getID());

        TimeZoneUtil.setTimeZone(null);
        assertEquals("Asia/Tokyo", TimeZone.getDefault().getID());
    }

    @Test
    void testSetLocale() {

        TimeZoneUtil.setLocale("fr_FR");
        assertEquals(new Locale("fr", "FR"), Locale.getDefault());


        TimeZoneUtil.setLocale("");
        assertEquals(new Locale("fr", "FR"), Locale.getDefault());

        TimeZoneUtil.setLocale(null);
        assertEquals(new Locale("fr", "FR"), Locale.getDefault());
    }

}
