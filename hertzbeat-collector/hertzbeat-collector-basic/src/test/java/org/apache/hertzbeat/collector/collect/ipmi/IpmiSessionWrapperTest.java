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

package org.apache.hertzbeat.collector.collect.ipmi;


import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.Ipmi20Ipv4SessionWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis.GetChassisStatusResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage1;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage2;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage3;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage4;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RmcpPlusOpenSessionRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.rmcp.RmcpPacket;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link Ipmi20Ipv4SessionWrapper}
 */
public class IpmiSessionWrapperTest {

    IpmiSession ipmiSession;

    @BeforeEach
    void setUp() {
        ipmiSession = new IpmiSession(0xA0A2A3A4);
        ipmiSession.setUserName("root");
        ipmiSession.setPassword("calvin");
    }

    @Test
    void testRmcpPlusOpenSessionRequest() {
        RmcpPlusOpenSessionRequest request = new RmcpPlusOpenSessionRequest();
        Ipmi20Ipv4SessionWrapper wrapper = new Ipmi20Ipv4SessionWrapper();
        wrapper.setIpmiPayload(request);
        RmcpPacket packet = new RmcpPacket();
        packet.withData(wrapper);
        int length = packet.getWireLength(ipmiSession);
        ByteBuffer buffer = ByteBuffer.allocate(length);
        packet.toWire(ipmiSession, buffer);
        buffer.flip();
        byte[] targetBytes = new byte[] {
                0x06, 0x00, (byte) 0xFF, 0x07, 0x06, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
                0x00, 0x00, 0x00, 0x00, (byte) 0xA4, (byte) 0xA3, (byte) 0xA2, (byte) 0xA0, 0x00, 0x00, 0x00,
                0x08, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x08, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x08,
                0x01, 0x00, 0x00, 0x00
        };
        for (byte targetByte : targetBytes) {
            assert targetByte == buffer.get();
        }
    }

    @Test
    void testRakp1() {
        ipmiSession.generateConsoleRandomNumber();
        ipmiSession.setSystemSessionId(0x02000300);
        ipmiSession.setConsoleRandomNumber(new byte[]{0x04, 0x79, (byte) 0xfe, (byte) 0xe3, (byte) 0xe0, (byte) 0xa2, 0x67, 0x0a, 0x11, (byte) 0xd3, 0x3f, 0x0e, 0x48, (byte) 0xbe, 0x62, (byte) 0xb8});
        RakpMessage1 request = new RakpMessage1();
        Ipmi20Ipv4SessionWrapper wrapper = new Ipmi20Ipv4SessionWrapper();
        wrapper.setIpmiPayload(request);
        RmcpPacket packet = new RmcpPacket();
        packet.withData(wrapper);
        int length = packet.getWireLength(ipmiSession);
        ByteBuffer buffer = ByteBuffer.allocate(length);
        packet.toWire(ipmiSession, buffer);
        buffer.flip();
        byte[] targetBytes = new byte[] {
                0x06, 0x00, (byte) 0xFF, 0x07, 0x06, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x02, 0x04, 0x79, (byte) 0xFE, (byte) 0xE3, (byte) 0xE0,
                (byte) 0xA2, 0x67, 0x0A, 0x11, (byte) 0xD3, 0x3F, 0x0E, 0x48, (byte) 0xBE, 0x62, (byte) 0xB8, 0x14,
                0x00, 0x00, 0x04, 0x72, 0x6F, 0x6F, 0x74
        };
        for (byte targetByte : targetBytes) {
            assert targetByte == buffer.get();
        }
    }

    @Test
    void testRakp2() {
        byte[] rakp2 = new byte[] {
                0x06, 0x00, (byte) 0xFF, 0x07, 0x06, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00,
                0x00, 0x00, 0x00, (byte) 0xA4, (byte) 0xA3, (byte) 0xA2, (byte) 0xA0, (byte) 0xA0, (byte) 0xEB, (byte) 0x3B, (byte) 0xBB,
                (byte) 0xA9, 0x62, (byte) 0xDB, 0x2A, 0x27, 0x5F, 0x64, 0x6B, (byte) 0xFF, (byte) 0x8A, (byte) 0xC6,
                (byte) 0xCF, 0x44, 0x45, 0x4C, 0x4C, 0x39, 0x00, 0x10, 0x38, (byte) 0x80, 0x38, (byte) 0xC4, (byte) 0xC0, 0x4F,
                (byte) 0x35, 0x58, 0x31, (byte) 0xE4, (byte) 0xF8, 0x46, 0x42, 0x33, (byte) 0x8B, 0x67, (byte) 0xA8,
                0x3F, 0x4E, (byte) 0xCF, 0x3B, 0x44, (byte) 0xCC, 0x0D, 0x70, (byte) 0xEF, 0x2B, (byte) 0xBD, (byte) 0x92
        };
        ipmiSession.setSystemSessionId(0x02000300);
        byte[] consoleRandom = new byte[]{
                0x04, 0x79, (byte) 0xfe, (byte) 0xe3, (byte) 0xe0, (byte) 0xa2, 0x67, 0x0a, 0x11, (byte) 0xd3, 0x3f,
                0x0e, 0x48, (byte) 0xbe, 0x62, (byte) 0xb8
        };
        ipmiSession.setConsoleRandomNumber(consoleRandom);
        RmcpPacket packet = new RmcpPacket();
        packet.fromWire(ipmiSession, ByteBuffer.wrap(rakp2));
        RakpMessage2 rakpMessage2 = packet.getEncapsulated(RakpMessage2.class);
        byte[] systemRandomNumber = new byte[] {
                (byte) 0xA0, (byte) 0xEB, 0x3B, (byte) 0xBB, (byte) 0xA9, 0x62,
                (byte) 0xDB, 0x2A, 0x27, 0x5F, 0x64, 0x6B, (byte) 0xFF, (byte) 0x8A, (byte) 0xC6, (byte) 0xCF
        };
        byte[] guid = new byte[] {
                0x44, 0x45, 0x4C, 0x4C, 0x39, 0x00, 0x10, 0x38, (byte) 0x80, 0x38, (byte) 0xC4,
                (byte) 0xC0, 0x4F, (byte) 0x35, 0x58, 0x31
        };
        for (int i = 0; i < systemRandomNumber.length; i++) {
            assert systemRandomNumber[i] == rakpMessage2.systemRandom[i];
        }
        for (int i = 0; i < guid.length; i++) {
            assert guid[i] == rakpMessage2.systemGuid[i];
        }
        assert rakpMessage2.consoleSessionId == ipmiSession.getConsoleSessionId();
    }

    @Test
    void testRakp3() {
        byte[] systemRandomNumber = new byte[] {
                (byte) 0xA0, (byte) 0xEB, 0x3B, (byte) 0xBB, (byte) 0xA9, 0x62,
                (byte) 0xDB, 0x2A, 0x27, 0x5F, 0x64, 0x6B, (byte) 0xFF, (byte) 0x8A, (byte) 0xC6, (byte) 0xCF
        };
        byte[] guid = new byte[] {
                0x44, 0x45, 0x4C, 0x4C, 0x39, 0x00, 0x10, 0x38, (byte) 0x80, 0x38, (byte) 0xC4,
                (byte) 0xC0, 0x4F, (byte) 0x35, 0x58, 0x31
        };
        ipmiSession.setSystemRandomNumber(systemRandomNumber);
        ipmiSession.setSystemGuid(guid);
        ipmiSession.setSystemSessionId(0x02000300);
        RakpMessage3 request = new RakpMessage3();
        Ipmi20Ipv4SessionWrapper wrapper = new Ipmi20Ipv4SessionWrapper();
        wrapper.setIpmiPayload(request);
        RmcpPacket packet = new RmcpPacket();
        packet.withData(wrapper);
        int length = packet.getWireLength(ipmiSession);
        ByteBuffer buffer = ByteBuffer.allocate(length);
        packet.toWire(ipmiSession, buffer);
        buffer.flip();
        byte[] targetBytes = new byte[] {
                0x06, 0x00, (byte) 0xFF, 0x07, 0x06, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1C, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x02, 0x6D, (byte) 0x86, (byte) 0xE3, 0x11, (byte) 0xEB,
                (byte) 0xB5, (byte) 0xBE, 0x51, (byte) 0x80, 0x16, (byte) 0xFD, 0x14, 0x35, 0x73, 0x3E, (byte) 0xAD,
                (byte) 0xBC, (byte) 0xB1, (byte) 0xC4, 0x66

        };
        for (byte targetByte : targetBytes) {
            assert targetByte == buffer.get();
        }
    }

    @Test
    void testRakp4() {
        byte[] rakp4 = new byte[] {
                0x06, 0x00, (byte) 0xFF, 0x07, 0x06, 0x15, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x14, 0x00, 0x00,
                0x00, 0x00, 0x00, (byte) 0xA4, (byte) 0xA3, (byte) 0xA2, (byte) 0xA0, (byte) 0x9C, 0x7C, (byte) 0xEB,
                0x17, (byte) 0xC7, (byte) 0xCA, 0x43, 0x3B, (byte) 0xB0, 0x61, (byte) 0xBA, 0x6D
        };
        byte[] consoleRandom = new byte[]{
                0x04, 0x79, (byte) 0xfe, (byte) 0xe3, (byte) 0xe0, (byte) 0xa2, 0x67, 0x0a, 0x11, (byte) 0xd3, 0x3f,
                0x0e, 0x48, (byte) 0xbe, 0x62, (byte) 0xb8
        };
        ipmiSession.setConsoleRandomNumber(consoleRandom);
        byte[] systemRandomNumber = new byte[] {
                (byte) 0xA0, (byte) 0xEB, 0x3B, (byte) 0xBB, (byte) 0xA9, 0x62,
                (byte) 0xDB, 0x2A, 0x27, 0x5F, 0x64, 0x6B, (byte) 0xFF, (byte) 0x8A, (byte) 0xC6, (byte) 0xCF
        };
        ipmiSession.setSystemRandomNumber(systemRandomNumber);
        ipmiSession.setSystemSessionId(0x02000300);
        byte[] guid = new byte[] {
                0x44, 0x45, 0x4C, 0x4C, 0x39, 0x00, 0x10, 0x38, (byte) 0x80, 0x38, (byte) 0xC4,
                (byte) 0xC0, 0x4F, (byte) 0x35, 0x58, 0x31
        };
        ipmiSession.setSystemGuid(guid);
        ipmiSession.generateSik();
        RmcpPacket packet = new RmcpPacket();
        packet.fromWire(ipmiSession, ByteBuffer.wrap(rakp4));
        RakpMessage4 rakpMessage4 = packet.getEncapsulated(RakpMessage4.class);
        assert rakpMessage4.consoleSessionId == ipmiSession.getConsoleSessionId();
    }

    @Test
    void testIpmiMessage() {
        byte[] consoleRandom = new byte[]{
                0x04, 0x79, (byte) 0xfe, (byte) 0xe3, (byte) 0xe0, (byte) 0xa2, 0x67, 0x0a, 0x11, (byte) 0xd3, 0x3f,
                0x0e, 0x48, (byte) 0xbe, 0x62, (byte) 0xb8
        };
        ipmiSession.setConsoleRandomNumber(consoleRandom);
        byte[] systemRandomNumber = new byte[] {
                (byte) 0xA0, (byte) 0xEB, 0x3B, (byte) 0xBB, (byte) 0xA9, 0x62,
                (byte) 0xDB, 0x2A, 0x27, 0x5F, 0x64, 0x6B, (byte) 0xFF, (byte) 0x8A, (byte) 0xC6, (byte) 0xCF
        };
        ipmiSession.setSystemRandomNumber(systemRandomNumber);
        ipmiSession.setSystemSessionId(0x02000300);
        byte[] guid = new byte[] {
                0x44, 0x45, 0x4C, 0x4C, 0x39, 0x00, 0x10, 0x38, (byte) 0x80, 0x38, (byte) 0xC4,
                (byte) 0xC0, 0x4F, (byte) 0x35, 0x58, 0x31
        };
        ipmiSession.setSystemGuid(guid);
        ipmiSession.generateSik();
        ipmiSession.setK1(ipmiSession.generateK(1));
        ipmiSession.setK2(ipmiSession.generateK(2));

        byte[] message = {
                (byte) 0x06, (byte) 0x00, (byte) 0xff, (byte) 0x07, (byte) 0x06, (byte) 0xc0, (byte) 0xa4, (byte) 0xa3,
                (byte) 0xa2, (byte) 0xa0, (byte) 0x06, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x20, (byte) 0x00,
                (byte) 0xa0, (byte) 0xeb, (byte) 0x3b, (byte) 0xbb, (byte) 0xa9, (byte) 0x62, (byte) 0xdb, (byte) 0x2a,
                (byte) 0x27, (byte) 0x5f, (byte) 0x64, (byte) 0x6b, (byte) 0xff, (byte) 0x8a, (byte) 0xc6, (byte) 0xcf,
                (byte) 0x4e, (byte) 0x4e, (byte) 0xe1, (byte) 0xab, (byte) 0xcc, (byte) 0xf7, (byte) 0x72, (byte) 0x09,
                (byte) 0x23, (byte) 0x63, (byte) 0xd3, (byte) 0xec, (byte) 0xb6, (byte) 0xdb, (byte) 0xf1, (byte) 0xb7,
                (byte) 0xff, (byte) 0xff, (byte) 0x02, (byte) 0x07, (byte) 0x68, (byte) 0x3b, (byte) 0x0e, (byte) 0x61,
                (byte) 0x8e, (byte) 0xd6, (byte) 0x6b, (byte) 0x3d, (byte) 0x32, (byte) 0x58, (byte) 0xf1, (byte) 0x1d
        };

        RmcpPacket packet = new RmcpPacket();
        packet.fromWire(ipmiSession, ByteBuffer.wrap(message));
        GetChassisStatusResponse response = packet.getEncapsulated(GetChassisStatusResponse.class);

    }
}
