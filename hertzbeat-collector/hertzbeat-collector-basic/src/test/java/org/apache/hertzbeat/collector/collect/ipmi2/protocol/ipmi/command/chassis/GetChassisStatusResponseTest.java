/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
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

class GetChassisStatusResponseTest {

    @Test
    void shouldDecodePowerControlFaultFlag() {
        GetChassisStatusResponse response = parseResponse(0x10);

        assertFalse(response.isLastPowerEventAcFailed);
        assertFalse(response.isLastPowerEventPowerOverload);
        assertFalse(response.isLastPowerEventPowerInterlock);
        assertFalse(response.isLastPowerEventPowerFault);
        assertTrue(response.isLastPowerEventPowerControlFault);
        assertEquals("Power Control Fault", response.lastPowerEvent);
    }

    @Test
    void shouldDecodeEachLastPowerEventFlagIndependently() {
        GetChassisStatusResponse acFailed = parseResponse(0x01);
        assertTrue(acFailed.isLastPowerEventAcFailed);
        assertEquals("AC Failed", acFailed.lastPowerEvent);

        GetChassisStatusResponse powerOverload = parseResponse(0x02);
        assertTrue(powerOverload.isLastPowerEventPowerOverload);
        assertEquals("Power Overload", powerOverload.lastPowerEvent);

        GetChassisStatusResponse powerInterlock = parseResponse(0x04);
        assertTrue(powerInterlock.isLastPowerEventPowerInterlock);
        assertEquals("Power Interlock Active", powerInterlock.lastPowerEvent);

        GetChassisStatusResponse powerFault = parseResponse(0x08);
        assertTrue(powerFault.isLastPowerEventPowerFault);
        assertEquals("Power Fault", powerFault.lastPowerEvent);

        GetChassisStatusResponse powerControlFault = parseResponse(0x10);
        assertTrue(powerControlFault.isLastPowerEventPowerControlFault);
        assertEquals("Power Control Fault", powerControlFault.lastPowerEvent);
    }

    @Test
    void shouldDecodeMultipleLastPowerEventFlags() {
        GetChassisStatusResponse response = parseResponse(0x18);

        assertFalse(response.isLastPowerEventAcFailed);
        assertFalse(response.isLastPowerEventPowerOverload);
        assertFalse(response.isLastPowerEventPowerInterlock);
        assertTrue(response.isLastPowerEventPowerFault);
        assertTrue(response.isLastPowerEventPowerControlFault);
        assertEquals("Power Fault, Power Control Fault", response.lastPowerEvent);
    }

    @Test
    void shouldDecodeAllLastPowerEventFlags() {
        GetChassisStatusResponse response = parseResponse(0x1F);

        assertTrue(response.isLastPowerEventAcFailed);
        assertTrue(response.isLastPowerEventPowerOverload);
        assertTrue(response.isLastPowerEventPowerInterlock);
        assertTrue(response.isLastPowerEventPowerFault);
        assertTrue(response.isLastPowerEventPowerControlFault);
        assertEquals(
                "AC Failed, Power Overload, Power Interlock Active, Power Fault, Power Control Fault",
                response.lastPowerEvent);
    }

    @Test
    void shouldIgnoreReservedLastPowerEventBits() {
        GetChassisStatusResponse response = parseResponse(0x80);

        assertFalse(response.isLastPowerEventAcFailed);
        assertFalse(response.isLastPowerEventPowerOverload);
        assertFalse(response.isLastPowerEventPowerInterlock);
        assertFalse(response.isLastPowerEventPowerFault);
        assertFalse(response.isLastPowerEventPowerControlFault);
        assertEquals("None", response.lastPowerEvent);
    }

    @Test
    void shouldReturnNoneWhenNoLastPowerEventIsSet() {
        GetChassisStatusResponse response = parseResponse(0x00);

        assertFalse(response.isLastPowerEventAcFailed);
        assertFalse(response.isLastPowerEventPowerOverload);
        assertFalse(response.isLastPowerEventPowerInterlock);
        assertFalse(response.isLastPowerEventPowerFault);
        assertFalse(response.isLastPowerEventPowerControlFault);
        assertEquals("None", response.lastPowerEvent);
    }

    private GetChassisStatusResponse parseResponse(int lastPowerEventByte) {
        GetChassisStatusResponse response = new GetChassisStatusResponse();
        ByteBuffer buffer = ByteBuffer.wrap(
                new byte[] {0x00, (byte) lastPowerEventByte, 0x00, 0x00});

        response.fromResponseData(null, buffer);

        return response;
    }
}