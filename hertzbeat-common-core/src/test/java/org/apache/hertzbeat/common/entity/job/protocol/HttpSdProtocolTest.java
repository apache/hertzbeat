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

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HttpSdProtocolTest {

    @Test
    void isInvalidValidHttpUrl() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("http://example.com/api/discovery")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidHttpsUrl() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("https://example.com/api/discovery")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidUrlWithPort() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("http://example.com:8080/api/discovery")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankUrl() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidNullUrl() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url(null)
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidUrlNoProtocol() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("example.com/api/discovery")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidUrlWrongProtocol() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("ftp://example.com/api/discovery")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidUrlOnlyProtocol() {
        HttpSdProtocol protocol = HttpSdProtocol.builder()
                .url("http://")
                .build();
        assertTrue(protocol.isInvalid());
    }
}