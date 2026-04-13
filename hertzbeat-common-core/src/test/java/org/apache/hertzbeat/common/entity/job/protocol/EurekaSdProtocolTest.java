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

class EurekaSdProtocolTest {

    @Test
    void isInvalidValidHttpUrl() {
        EurekaSdProtocol protocol = EurekaSdProtocol.builder()
                .url("http://127.0.0.1:8761/eureka")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidHttpsUrl() {
        EurekaSdProtocol protocol = EurekaSdProtocol.builder()
                .url("https://eureka.example.com/eureka")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankUrl() {
        EurekaSdProtocol protocol = EurekaSdProtocol.builder()
                .url("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedScheme() {
        EurekaSdProtocol protocol = EurekaSdProtocol.builder()
                .url("ftp://eureka.example.com/eureka")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidMalformedUrl() {
        EurekaSdProtocol protocol = EurekaSdProtocol.builder()
                .url("http://")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
