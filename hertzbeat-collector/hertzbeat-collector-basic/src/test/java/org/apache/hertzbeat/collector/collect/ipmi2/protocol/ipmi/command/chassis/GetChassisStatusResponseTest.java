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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.ByteBuffer;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link GetChassisStatusResponse}.
 */
class GetChassisStatusResponseTest {

    @Test
    void testParseLastPowerEventNone() {
        assertEquals("None", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x00));
    }

    @Test
    void testParseLastPowerEventIndividualFlags() {
        assertEquals("AC Failed", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x01));
        assertEquals("Power Overload", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x02));
        assertEquals("Power Interlock", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x04));
        assertEquals("Power Fault", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x08));
        assertEquals("Power On via IPMI", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x10));
    }

    @Test
    void testParseLastPowerEventMultipleFlags() {
        assertEquals("AC Failed, Power On via IPMI", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x11));
        assertEquals("Power Overload, Power Fault", GetChassisStatusResponse.parseLastPowerEvent((byte) 0x0A));
    }

    @Test
    void testParseLastPowerEventWithReservedBitsMasked() {
        // Reserved bits [7:5] should be masked out
        assertEquals("Power On via IPMI", GetChassisStatusResponse.parseLastPowerEvent((byte) 0xF0));
        assertEquals("None", GetChassisStatusResponse.parseLastPowerEvent((byte) 0xE0));
    }

    @Test
    void testFromResponseDataWithPowerOnViaIpmiCode() {
        // Byte 1: Power On (bit 0=1), Power Restore Policy = Always On (bits 6:5 = 10b -> 0x40 | 0x01 = 0x41)
        // Byte 2: Last Power Event = 0x10 (Power on via IPMI command)
        // Byte 3: Misc Chassis State = 0x00
        // Byte 4: Extra ignored byte = 0x00
        byte[] responseBytes = new byte[] { (byte) 0x41, (byte) 0x10, (byte) 0x00, (byte) 0x00 };
        GetChassisStatusResponse response = new GetChassisStatusResponse();
        response.fromResponseData(null, ByteBuffer.wrap(responseBytes));

        assertTrue(response.isPowerOn);
        assertFalse(response.isPowerFault);
        assertFalse(response.isPowerOverload);
        assertEquals("Always On", response.powerRestorePolicy);
        assertEquals("Power On via IPMI", response.lastPowerEvent);
        assertFalse(response.isFrontPanelLockoutActive);
        assertFalse(response.isDriveFault);
        assertFalse(response.isFanFault);
    }
}
