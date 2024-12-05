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
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiAuthenticationCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.IpmiAuthentication;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.22
 */
public class RakpMessage3 extends AbstractSessionIpmiPayload{

    private int systemSessionId;

    private MessageStatusCode messageStatusCode = MessageStatusCode.NO_ERRORS;
    private byte[] keyExchangeAuthenticationCode;

    @Override
    public int getWireLength(IpmiPacketContext context) {
        IpmiSession session = context.getIpmiSession();
        IpmiAuthentication authentication = session.getAuthenticationAlgorithm().newIpmiAuthentication();
        if (authentication == null) {
            throw new UnsupportedOperationException("Unsupported authentication code: " + session.getAuthenticationAlgorithm());
        }
        return  8 + authentication.getHashLength();
    }

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        buffer.put(messageTag);
        buffer.put(messageStatusCode.getCode());
        reservedBytes(buffer, 2);
        systemSessionId = context.getIpmiSession().getSystemSessionId();
        ByteOrderUtils.writeLeInt(buffer, systemSessionId);
        keyExchangeAuthenticationCode = generateKeyExchangeAuthenticationCode(context.getIpmiSession());
        ByteOrderUtils.writeBytes(buffer, keyExchangeAuthenticationCode);
    }

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        throw new UnsupportedOperationException("Not implemented");
    }

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.RAKPMessage3;
    }

    private byte[] generateKeyExchangeAuthenticationCode(IpmiSession session) {
        String userName = session.getUserName();
        int length = 22 + ((userName == null) ? 0 : userName.length());
        ByteBuffer buffer = ByteBuffer.allocate(length);
        ByteOrderUtils.writeBytes(buffer, session.getSystemRandomNumber());
        ByteOrderUtils.writeLeInt(buffer, session.getConsoleSessionId());
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
