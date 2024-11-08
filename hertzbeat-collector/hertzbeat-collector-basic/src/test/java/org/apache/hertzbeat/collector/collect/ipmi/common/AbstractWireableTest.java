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

package org.apache.hertzbeat.collector.collect.ipmi.common;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.AbstractWireable;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AbstractWireable}
 */
public class AbstractWireableTest {

    public static final byte b = 0b01010101;

    @Test
    void testSetBits() {
        byte result = AbstractWireable.setBits(b, 0, 0x03, 0x02);
        assert result == 0b01010110;

        result = AbstractWireable.setBits(b, 0x03, 0x02);
        assert result == 0b01010110;

        result = AbstractWireable.setBits(b, 0x02);
        assert result == 0b00000010;

        result = AbstractWireable.setBits(b, 2, 0x03, 0x02);
        assert result == 0b01011001;

        result = AbstractWireable.setBits(b, 2, 0x03, 0x04);
        assert result == 0b01010001;
    }
}
