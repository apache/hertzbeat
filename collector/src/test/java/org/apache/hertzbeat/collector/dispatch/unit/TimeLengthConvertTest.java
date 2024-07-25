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

package org.apache.hertzbeat.collector.dispatch.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.apache.hertzbeat.collector.dispatch.unit.impl.TimeLengthConvert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link TimeLengthConvert}
 */
class TimeLengthConvertTest {

    private TimeLengthConvert convert;

    @BeforeEach
    void setUp() {
        this.convert = new TimeLengthConvert();
    }

    /**
     * test nanoseconds to second
     */
    @Test
    void convertNs2Sec() {
        String result = convert.convert("1000000000", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.S.getUnit());
        assertEquals("1", result);
    }

    /**
     * test nanoseconds to milliseconds
     */
    @Test
    void convertNs2Ms() {
        String result = convert.convert("1000123450", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.MS.getUnit());
        assertEquals("1000.1235", result);
    }

    /**
     * test nanosecond to microsecond
     */
    @Test
    void convertNs2Us() {
        String result = convert.convert("1000000000", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.US.getUnit());
        assertEquals("1000000", result);
    }

    /**
     * test nanoseconds to sky
     */
    @Test
    void convertNs2Day() {
        String result = convert.convert("86400000000000", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.D.getUnit());
        assertEquals("1", result);
    }

}
