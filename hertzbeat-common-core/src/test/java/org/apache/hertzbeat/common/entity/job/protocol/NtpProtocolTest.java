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

package org.apache.hertzbeat.common.entity.job.protocol;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class NtpProtocolTest {

    @Test
    void isInvalidValidProtocolWithoutPort() {
        NtpProtocol protocol = NtpProtocol.builder()
                .host("pool.ntp.org")
                .timeout("3000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithPort() {
        NtpProtocol protocol = NtpProtocol.builder()
                .host("192.168.1.1")
                .port("123")
                .timeout("3000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithoutTimeout() {
        NtpProtocol protocol = NtpProtocol.builder()
                .host("pool.ntp.org")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        NtpProtocol protocol = NtpProtocol.builder()
                .host("")
                .timeout("3000")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        NtpProtocol protocol = NtpProtocol.builder()
                .host("pool.ntp.org")
                .port("70000")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        NtpProtocol protocol = NtpProtocol.builder()
                .host("pool.ntp.org")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
