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

class SmtpProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        SmtpProtocol protocol = SmtpProtocol.builder()
                .host("smtp.example.com")
                .port("25")
                .email("test@example.com")
                .timeout("3000")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithoutTimeout() {
        SmtpProtocol protocol = SmtpProtocol.builder()
                .host("smtp.example.com")
                .port("25")
                .email("test@example.com")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankEmail() {
        SmtpProtocol protocol = SmtpProtocol.builder()
                .host("smtp.example.com")
                .port("25")
                .email("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        SmtpProtocol protocol = SmtpProtocol.builder()
                .host("")
                .port("25")
                .email("test@example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        SmtpProtocol protocol = SmtpProtocol.builder()
                .host("smtp.example.com")
                .port("70000")
                .email("test@example.com")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        SmtpProtocol protocol = SmtpProtocol.builder()
                .host("smtp.example.com")
                .port("25")
                .email("test@example.com")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
