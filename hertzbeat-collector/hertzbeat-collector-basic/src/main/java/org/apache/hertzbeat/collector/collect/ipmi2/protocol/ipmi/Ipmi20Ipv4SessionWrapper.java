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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi;

import java.nio.ByteBuffer;
import java.util.Arrays;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayload;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.IpmiPayloadType;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiAuthenticationCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiConfidentialityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiIntegrityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.IpmiConfidentiality;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.integrity.IpmiIntegrity;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;

/**
 *  See IPMIv2 Section 13.6
 */
public class Ipmi20Ipv4SessionWrapper extends AbstractIpmiSessionWrapper{

    private static final IpmiSessionAuthenticationType AUTH_TYPE = IpmiSessionAuthenticationType.RMCPP;

    @Override
    public int getWireLength(IpmiPacketContext context) {
        IpmiPayload payload = getIpmiPayload();
        int rawDataLength = payload.getWireLength(context);
        int encryptDataLength = rawDataLength;
        IpmiConfidentialityCode confidentialityCode = getConfidentialityCode(context.getIpmiSession());
        if (!IpmiConfidentialityCode.NONE.equals(confidentialityCode)) {
            IpmiConfidentiality confidentiality = confidentialityCode.newIpmiConfidentiality();
            if (confidentiality == null) {
                throw new UnsupportedOperationException("Such confidentiality algorithm not support");
            }
            encryptDataLength = confidentiality.getEncryptedLength(rawDataLength);
        }
        int integrityDataLength = 0;
        IpmiIntegrityCode integrityCode = getIntegrityCode(context.getIpmiSession());
        if (!IpmiIntegrityCode.NONE.equals(integrityCode)) {
            int padLength = 4 - (12 + encryptDataLength + 1 + 1) % 4;
            IpmiIntegrity ipmiIntegrity = integrityCode.newIpmiIntegrity();
            if (ipmiIntegrity == null) {
                throw new UnsupportedOperationException("Such integrity algorithm not support");
            }
            integrityDataLength = padLength + 1 + 1 + ipmiIntegrity.getHashLength();
        }
        return 12 + encryptDataLength + integrityDataLength;
    }

    public IpmiConfidentialityCode getConfidentialityCode(IpmiSession session) {
        if (getIpmiSessionId() == 0) {
            return IpmiConfidentialityCode.NONE;
        }
        return session.getConfidentialityAlgorithm();
    }

    public IpmiAuthenticationCode getAuthenticationCode(IpmiSession session) {
        if (getIpmiSessionId() == 0) {
            return IpmiAuthenticationCode.RAKP_NOME;
        }
        return session.getAuthenticationAlgorithm();
    }

    public IpmiIntegrityCode getIntegrityCode(IpmiSession session) {
        if (getIpmiSessionId() == 0) {
            return IpmiIntegrityCode.NONE;
        }
        return session.getIntegrityAlgorithm();
    }

    @Override
    public void toWire(IpmiPacketContext context, ByteBuffer buffer) {
        IpmiSession session = context.getIpmiSession();

        IpmiConfidentialityCode confidentialityCode = getConfidentialityCode(session);
        IpmiIntegrityCode integrityCode = getIntegrityCode(session);

        IpmiPayload payload = getIpmiPayload();

        ByteBuffer integrityInput = buffer.duplicate();

        buffer.put(AUTH_TYPE.getCode());

        boolean encrypted = !IpmiConfidentialityCode.NONE.equals(confidentialityCode);
        boolean authenticated = !IpmiIntegrityCode.NONE.equals(integrityCode);
        byte tmp = setBits((byte) 0, payload.getPayloadType().getCode(), IpmiPayloadType.MASK);
        tmp = setBits(tmp, 6, 0x1, authenticated ? 1 : 0);
        tmp = setBits(tmp, 7, 0x1, encrypted ? 1 : 0);
        buffer.put(tmp);

        if (IpmiPayloadType.OEM_EXPLICIT.equals(payload.getPayloadType())) {
            throw new UnsupportedOperationException("OEM explicit payload not supported");
        }

        ByteOrderUtils.writeLeInt(buffer, getIpmiSessionId());
        ByteOrderUtils.writeLeInt(buffer, getIpmiSessionSequenceNumber());

        IpmiConfidentiality confidentiality = confidentialityCode.newIpmiConfidentiality();
        int rawDataLength = payload.getWireLength(context);
        if (confidentiality == null) {
            throw new UnsupportedOperationException("Such confidentiality algorithm not support");
        }
        int encryptDataLength = confidentiality.getEncryptedLength(rawDataLength);
        ByteOrderUtils.writeLeChar(buffer, (char) encryptDataLength);

        try {
            if (encrypted) {
                ByteBuffer raw = ByteBuffer.allocate(rawDataLength);
                payload.toWire(context, raw);
                raw.flip();
                confidentiality.encrypt(session, raw, buffer);
            } else {
                payload.toWire(context, buffer);
            }

            if (authenticated) {
                int padLength = 4 - (12 + encryptDataLength + 1 + 1) % 4;
                byte[] pad = new byte[padLength];
                for (int i = 0; i < padLength; i++) {
                    pad[i] = (byte) 0xFF;
                }
                buffer.put(pad);
                buffer.put((byte) padLength);
                buffer.put((byte) 0x07);
                integrityInput.limit(buffer.position());
                IpmiIntegrity ipmiIntegrity = integrityCode.newIpmiIntegrity();
                if (ipmiIntegrity == null) {
                    throw new UnsupportedOperationException("Such integrity algorithm not support");
                }
                ipmiIntegrity.setKey(session.getK1());
                ipmiIntegrity.setData(ByteOrderUtils.readBytes(integrityInput, integrityInput.limit() - integrityInput.position()));
                byte[] integrityData = ipmiIntegrity.getHash();
                buffer.put(integrityData);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void fromWire(IpmiPacketContext context, ByteBuffer buffer) {
        IpmiSession session = context.getIpmiSession();
        ByteBuffer integrityInput = buffer.duplicate();

        IpmiSessionAuthenticationType type = IpmiCode.fromByte(IpmiSessionAuthenticationType.class, buffer.get());
        if (!IpmiSessionAuthenticationType.RMCPP.equals(type)) {
            throw new UnsupportedOperationException("Unsupported authentication type: " + type);
        }

        byte tmp = buffer.get();
        boolean encrypted = getBits(tmp, 7, 0x01) == 1;
        boolean authenticated = getBits(tmp, 6, 0x01) == 1;
        IpmiPayloadType payloadType = IpmiCode.fromByte(IpmiPayloadType.class, getBits(tmp, IpmiPayloadType.MASK));

        setIpmiSessionId(ByteOrderUtils.readLeInt(buffer));
        setIpmiSessionSequenceNumber(ByteOrderUtils.readLeInt(buffer));

        int payloadLength = ByteOrderUtils.readLeChar(buffer);

        ByteBuffer encryptedBuffer = buffer.duplicate();
        encryptedBuffer.limit(encryptedBuffer.position() + payloadLength);
        buffer.position(encryptedBuffer.position() + payloadLength);

        try  {
            ByteBuffer decryptedBuffer;
            if (encrypted) {
                IpmiConfidentialityCode confidentialityCode = getConfidentialityCode(session);
                IpmiConfidentiality confidentiality = confidentialityCode.newIpmiConfidentiality();
                if (confidentiality == null) {
                    throw new UnsupportedOperationException("Such confidentiality algorithm not support");
                }
                decryptedBuffer = confidentiality.decrypt(session, encryptedBuffer);
            } else {
                decryptedBuffer = encryptedBuffer;
            }
            IpmiPayload payload = newIpmiPayload(decryptedBuffer, payloadType);
            payload.fromWire(context, decryptedBuffer);
            setIpmiPayload(payload);


            if (authenticated) {
                int padLength = 4 - (12 + payloadLength + 1 + 1) % 4;
                ignoreBytes(buffer, padLength + 2);
                integrityInput.limit(buffer.position());
                IpmiIntegrityCode ipmiIntegrityCode = session.getIntegrityAlgorithm();
                IpmiIntegrity ipmiIntegrity = ipmiIntegrityCode.newIpmiIntegrity();
                if (ipmiIntegrity == null) {
                    throw new UnsupportedOperationException("Such integrity algorithm not support");
                }
                ipmiIntegrity.setKey(session.getK1());
                ipmiIntegrity.setData(ByteOrderUtils.readBytes(integrityInput, integrityInput.limit() - integrityInput.position()));
                byte[] expectIntegrityData = ipmiIntegrity.getHash();
                byte[] actualIntegrityData = ByteOrderUtils.readBytes(buffer, ipmiIntegrity.getHashLength());
                if (!Arrays.equals(expectIntegrityData, actualIntegrityData)) {
                    throw new RuntimeException("Integrity check failed");
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
