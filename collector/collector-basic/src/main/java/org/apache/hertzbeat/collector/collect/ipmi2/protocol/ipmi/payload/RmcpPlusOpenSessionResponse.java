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
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiAuthenticationCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiConfidentialityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiIntegrityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.18
 */
public class RmcpPlusOpenSessionResponse extends AbstractSessionIpmiPayload {

    public MessageStatusCode messageStatusCode;
    public AbstractSessionIpmiPayload.MaximumPrivilegeLevel maximumPrivilegeLevel;

    public IpmiAuthenticationCode authenticationCode;

    public IpmiConfidentialityCode confidentialityCode;

    public IpmiIntegrityCode integrityCode;

    public int consoleSessionId;

    public int systemSessionId;

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
        maximumPrivilegeLevel = IpmiCode.fromBufferWithMask(AbstractSessionIpmiPayload.MaximumPrivilegeLevel.class, buffer, MaximumPrivilegeLevel.MASK);
        ignoreBytes(buffer, 1);
        consoleSessionId = ByteOrderUtils.readLeInt(buffer);
        systemSessionId = ByteOrderUtils.readLeInt(buffer);
        ignoreBytes(buffer, 4);
        authenticationCode = IpmiCode.fromBuffer(IpmiAuthenticationCode.class, buffer);
        ignoreBytes(buffer, 3);
        ignoreBytes(buffer, 4);
        integrityCode = IpmiCode.fromBuffer(IpmiIntegrityCode.class, buffer);
        ignoreBytes(buffer, 3);
        ignoreBytes(buffer, 4);
        confidentialityCode = IpmiCode.fromBuffer(IpmiConfidentialityCode.class, buffer);
        ignoreBytes(buffer, 3);
    }

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.RMCPOpenSessionResponse;
    }
}
