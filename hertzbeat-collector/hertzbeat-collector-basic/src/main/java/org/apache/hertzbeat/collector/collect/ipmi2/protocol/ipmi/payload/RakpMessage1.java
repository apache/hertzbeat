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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.20
 */
public class RakpMessage1 extends AbstractSessionIpmiPayload {

    public int systemSessionId;

    public byte[] consoleRandomNumber;

    public int nameLookup = 0x1;

    public MaximumPrivilegeLevel maximumPrivilegeLevel;

    @Override
    public int getWireLength(IpmiPacketContext context) {
        String userName = context.getIpmiSession().getUserName();
        return 28 + ((userName == null) ? 0 : userName.length());
    }

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        buffer.put(messageTag);
        reservedBytes(buffer, 3);
        systemSessionId = context.getIpmiSession().getSystemSessionId();
        ByteOrderUtils.writeLeInt(buffer, systemSessionId);
        consoleRandomNumber = context.getIpmiSession().getConsoleRandomNumber();
        buffer.put(consoleRandomNumber);
        byte t = setBits((byte) 0, 4, 0x1, nameLookup);
        maximumPrivilegeLevel = context.getIpmiSession().getMaximumPrivilegeLevel();
        t = setBits(t, 0, MaximumPrivilegeLevel.MASK, maximumPrivilegeLevel.getCode());
        buffer.put(t);
        reservedBytes(buffer, 2);
        String userName = context.getIpmiSession().getUserName();
        if (userName != null) {
            byte[] usernameBytes = userName.getBytes(StandardCharsets.US_ASCII);
            buffer.put((byte) usernameBytes.length);
            buffer.put(usernameBytes);
        } else {
            buffer.put((byte) 0);
        }
    }

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        throw new UnsupportedOperationException("Not implemented");
    }

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.RAKPMessage1;
    }
}
