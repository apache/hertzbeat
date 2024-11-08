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
import java.security.InvalidKeyException;
import java.util.Arrays;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiIntegrityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.IpmiIntegrity;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.23
 */
public class RakpMessage4 extends AbstractSessionIpmiPayload {

    private MessageStatusCode messageStatusCode;

    public int consoleSessionId;

    public byte[] integrityCheckValue;

    @Override
    public int getWireLength(IpmiPacketContext context) {
        return 0;
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
        integrityCheckValue = ByteOrderUtils.readBytes(buffer, buffer.remaining());
        byte[] hash = verifyIntegrityCheckValue(context.getIpmiSession());
        if (!Arrays.equals(hash, integrityCheckValue)) {
            throw new RuntimeException("integrity check value mismatch");
        }
    }

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.RAKPMessage4;
    }


    public byte[] verifyIntegrityCheckValue(IpmiSession session) {
        int length = 36;
        ByteBuffer buffer = ByteBuffer.allocate(length);
        ByteOrderUtils.writeBytes(buffer, session.getConsoleRandomNumber());
        ByteOrderUtils.writeLeInt(buffer, session.getSystemSessionId());
        ByteOrderUtils.writeBytes(buffer, session.getSystemGuid());
        IpmiIntegrityCode ipmiIntegrityCode = session.getIntegrityAlgorithm();
        IpmiIntegrity ipmiIntegrity = ipmiIntegrityCode.newIpmiIntegrity();
        if (ipmiIntegrity == null) {
            throw new UnsupportedOperationException("Unsupported authentication code: " + ipmiIntegrityCode);
        }
        try {
            ipmiIntegrity.setKey(session.getSik());
            ipmiIntegrity.setData(buffer.array());
            return ipmiIntegrity.getHash();
        } catch (InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }
}
