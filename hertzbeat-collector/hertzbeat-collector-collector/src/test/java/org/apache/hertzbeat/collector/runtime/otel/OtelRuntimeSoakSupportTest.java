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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class OtelRuntimeSoakSupportTest {

    @Test
    void parsesMacOsAndPosixCumulativeCpuTime() {
        assertEquals(30L, OtelRuntimeSoakSupport.parseCpuTime(" 00:00.03\n"));
        assertEquals(62_500L, OtelRuntimeSoakSupport.parseCpuTime("1:02.5"));
        assertEquals(3_723_456L, OtelRuntimeSoakSupport.parseCpuTime("01:02:03.456"));
        assertEquals(176_523_000L, OtelRuntimeSoakSupport.parseCpuTime("2-01:02:03"));
    }

    @Test
    void rejectsAmbiguousMalformedOrOverflowingCpuTime() {
        assertNull(OtelRuntimeSoakSupport.parseCpuTime(null));
        assertNull(OtelRuntimeSoakSupport.parseCpuTime(""));
        assertNull(OtelRuntimeSoakSupport.parseCpuTime("1:2"));
        assertNull(OtelRuntimeSoakSupport.parseCpuTime("01:60:00"));
        assertNull(OtelRuntimeSoakSupport.parseCpuTime("00:00.1234"));
        assertNull(OtelRuntimeSoakSupport.parseCpuTime(Long.MAX_VALUE + "-00:00:00"));
    }
}
