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
import java.security.InvalidKeyException;
import java.util.Arrays;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiAuthenticationCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.IpmiAuthentication;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.21
 */
public class RakpMessage2 extends AbstractSessionIpmiPayload {

    public MessageStatusCode messageStatusCode;

    public int consoleSessionId;
    public byte[] systemRandom;
    public byte[] systemGuid;
    public byte[] keyExchangeAuthenticationCode;

    @Override
    public int getWireLength(IpmiPacketContext context) {
        return 40 + keyExchangeAuthenticationCode.length;
    }

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        throw new UnsupportedOperationException("Not implemented");
    }

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        messageTag = buffer.get();
        messageStatusCode = IpmiCode.fromBuffer(MessageStatusCode.class, buffer);
        ignoreBytes(buffer, 2);
        consoleSessionId = ByteOrderUtils.readLeInt(buffer);
        systemRandom = ByteOrderUtils.readBytes(buffer, 16);
        systemGuid = ByteOrderUtils.readBytes(buffer, 16);
        keyExchangeAuthenticationCode = ByteOrderUtils.readBytes(buffer, buffer.remaining());
        byte[] hash = verifyKeyExchangeAuthenticationCode(context.getIpmiSession());
        if (!Arrays.equals(hash, keyExchangeAuthenticationCode)) {
            throw new RuntimeException("Key exchange authentication code mismatch");
        }
    }

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.RAKPMessage2;
    }


    public byte[] verifyKeyExchangeAuthenticationCode(IpmiSession session) {
        String userName = session.getUserName();
        int length = 58 + ((userName == null) ? 0 : userName.length());
        ByteBuffer buffer = ByteBuffer.allocate(length);
        ByteOrderUtils.writeLeInt(buffer, session.getConsoleSessionId());
        ByteOrderUtils.writeLeInt(buffer, session.getSystemSessionId());
        ByteOrderUtils.writeBytes(buffer, session.getConsoleRandomNumber());
        ByteOrderUtils.writeBytes(buffer, systemRandom);
        ByteOrderUtils.writeBytes(buffer, systemGuid);
        byte t = setBits((byte) 0, 4, 0x1, 1);
        MaximumPrivilegeLevel maximumPrivilegeLevel = session.getMaximumPrivilegeLevel();
        t = setBits(t, 0, MaximumPrivilegeLevel.MASK, maximumPrivilegeLevel.getCode());
        buffer.put(t);
        if (userName != null) {
            byte[] usernameBytes = userName.getBytes(StandardCharsets.US_ASCII);
            buffer.put((byte) usernameBytes.length);
            buffer.put(usernameBytes);
        } else {
            buffer.put((byte) 0);
        }
        IpmiAuthenticationCode authenticationCode = session.getAuthenticationAlgorithm();
        IpmiAuthentication authentication = authenticationCode.newIpmiAuthentication();
        if (authentication == null) {
            throw new UnsupportedOperationException("Unsupported authentication code: " + authenticationCode);
        }
        try {
            authentication.setKey(session.getPassword().getBytes(StandardCharsets.US_ASCII));
            authentication.setData(buffer.array());
            return authentication.getHash();
        } catch (InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }
}
