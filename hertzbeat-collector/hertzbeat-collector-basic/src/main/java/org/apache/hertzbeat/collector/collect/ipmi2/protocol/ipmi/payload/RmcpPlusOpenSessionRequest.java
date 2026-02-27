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
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiAuthenticationCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiConfidentialityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiIntegrityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.IpmiAuthenticationAlgorithmWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.IpmiConfidentialityAlgorithmWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.IpmiIntegrityAlgorithmWrapper;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.17
 */
public class RmcpPlusOpenSessionRequest extends AbstractSessionIpmiPayload {

    public AbstractSessionIpmiPayload.MaximumPrivilegeLevel maximumPrivilegeLevel = MaximumPrivilegeLevel.UNSPECIFIED;

    public int consoleSessionId;

    public IpmiAuthenticationCode authenticationCode;

    public IpmiIntegrityCode integrityCode;

    public IpmiConfidentialityCode confidentialityCode;

    @Override
    public int getWireLength(IpmiPacketContext context) {
        return 32;
    }

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        buffer.put(messageTag);
        buffer.put(maximumPrivilegeLevel.getCode());
        reservedBytes(buffer, 2);
        IpmiSession ipmiSession = context.getIpmiSession();
        consoleSessionId = ipmiSession.getConsoleSessionId();
        authenticationCode = ipmiSession.getAuthenticationAlgorithm();
        integrityCode = ipmiSession.getIntegrityAlgorithm();
        confidentialityCode = ipmiSession.getConfidentialityAlgorithm();
        ByteOrderUtils.writeLeInt(buffer, consoleSessionId);
        IpmiAuthenticationAlgorithmWrapper authenticationAlgorithmWrapper = new IpmiAuthenticationAlgorithmWrapper(authenticationCode);
        authenticationAlgorithmWrapper.toWire(context, buffer);
        IpmiIntegrityAlgorithmWrapper integrityAlgorithmWrapper = new IpmiIntegrityAlgorithmWrapper(integrityCode);
        integrityAlgorithmWrapper.toWire(context, buffer);
        IpmiConfidentialityAlgorithmWrapper confidentialityAlgorithmWrapper = new IpmiConfidentialityAlgorithmWrapper(confidentialityCode);
        confidentialityAlgorithmWrapper.toWire(context, buffer);
    }

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        throw new UnsupportedOperationException("Not implemented");
    }

    @Override
    public IpmiPayloadType getPayloadType() {
        return IpmiPayloadType.RMCPOpenSessionRequest;
    }
}
