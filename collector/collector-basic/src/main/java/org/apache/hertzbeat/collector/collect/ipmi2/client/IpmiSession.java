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

package org.apache.hertzbeat.collector.collect.ipmi2.client;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.Data;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.AbstractWireable;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.AbstractSessionIpmiPayload;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiAuthenticationCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiConfidentialityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiIntegrityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.authentication.IpmiAuthentication;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteOrderUtils;


/**
 * Ipmi session
 */
@Data
public class IpmiSession implements IpmiPacketContext {

    private final int consoleSessionId;

    private int systemSessionId;

    private byte[] consoleRandomNumber;

    private byte[] systemRandomNumber;

    private byte[] systemGuid;

    private byte[] sik;

    private byte[] k1;

    private byte[] k2;

    private String userName;

    private String password;

    private boolean isConnected = false;

    private AtomicInteger authenticatedSequenceNumber = new AtomicInteger(1);

    private AtomicInteger unauthenticatedSequenceNumber = new AtomicInteger(1);

    private IpmiAuthenticationCode authenticationAlgorithm = IpmiAuthenticationCode.RAKP_HMAC_SHA1;
    private IpmiConfidentialityCode confidentialityAlgorithm = IpmiConfidentialityCode.AES_CBC_128;
    private IpmiIntegrityCode integrityAlgorithm = IpmiIntegrityCode.HMAC_SHA1_96;

    private AbstractSessionIpmiPayload.MaximumPrivilegeLevel maximumPrivilegeLevel = AbstractSessionIpmiPayload.MaximumPrivilegeLevel.ADMINISTRATOR;

    public IpmiSession(int consoleSessionId) {
        this.consoleSessionId = consoleSessionId;
    }

    public void generateSik() {
        int length = 34 + ((userName == null) ? 0 : userName.length());
        ByteBuffer buffer = ByteBuffer.allocate(length);
        ByteOrderUtils.writeBytes(buffer, consoleRandomNumber);
        ByteOrderUtils.writeBytes(buffer, systemRandomNumber);
        byte t = AbstractWireable.setBits((byte) 0, 4, 0x1, 1);
        AbstractSessionIpmiPayload.MaximumPrivilegeLevel maximumPrivilegeLevel = this.getMaximumPrivilegeLevel();
        t = AbstractWireable.setBits(t, 0, AbstractSessionIpmiPayload.MaximumPrivilegeLevel.MASK, maximumPrivilegeLevel.getCode());
        buffer.put(t);
        if (userName != null) {
            byte[] usernameBytes = userName.getBytes(StandardCharsets.US_ASCII);
            buffer.put((byte) usernameBytes.length);
            buffer.put(usernameBytes);
        } else {
            buffer.put((byte) 0);
        }
        IpmiAuthenticationCode authenticationCode = authenticationAlgorithm;
        IpmiAuthentication authentication = authenticationCode.newIpmiAuthentication();
        if (authentication == null) {
            throw new UnsupportedOperationException("Unsupported authentication code: " + authenticationCode);
        }
        try {
            authentication.setKey(password.getBytes(StandardCharsets.US_ASCII));
            authentication.setData(buffer.array());
            sik = authentication.getHash();
        } catch (InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }

    public byte[] generateK(int n) {
        byte[] data = new byte[20];
        Arrays.fill(data, (byte) n);
        IpmiAuthentication authentication = authenticationAlgorithm.newIpmiAuthentication();
        if (authentication == null) {
            throw new UnsupportedOperationException("Unsupported authentication code: " + authenticationAlgorithm);
        }
        try {
            authentication.setKey(sik);
            authentication.setData(data);
            return authentication.getHash();
        } catch (InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }

    public void generateConsoleRandomNumber() {
        SecureRandom random = new SecureRandom();
        consoleRandomNumber = random.generateSeed(16);
    }

    @Override
    public IpmiSession getIpmiSession() {
        return this;
    }
}
