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

package org.apache.hertzbeat.collector.collect.ipmi.security;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.IpmiConfidentialityCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.security.confidentiality.IpmiConfidentiality;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link IpmiConfidentiality}
 */
public class IpmiConfidentialityTest {

    IpmiSession session;

    @BeforeEach
    public void setUp() {
        session = new IpmiSession(1);
        session.setK2(new byte[]{0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                0x10});

    }

    @Test
    public void testAesCbc128() throws Exception {
        String message = "Hello World!";
        IpmiConfidentialityCode code = IpmiConfidentialityCode.AES_CBC_128;
        IpmiConfidentiality confidentiality = code.newIpmiConfidentiality();
        ByteBuffer in = ByteBuffer.allocate(1024);
        ByteBuffer out = ByteBuffer.allocate(1024);
        in.put(message.getBytes(StandardCharsets.UTF_8));
        in.flip();
        assert confidentiality != null;
        confidentiality.encrypt(session, in, out);
        out.flip();
        ByteBuffer decrypt = confidentiality.decrypt(session, out);
        assert message.equals(asString(decrypt));
    }

    private static String asString(final ByteBuffer buffer) {
        final ByteBuffer copy = buffer.duplicate();
        final byte[] bytes = new byte[copy.remaining()];
        copy.get(bytes);
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
