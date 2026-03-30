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

class WebsocketProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .port("80")
                .path("/")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidProtocolWithoutPath() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .port("80")
                .path("")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("")
                .port("80")
                .path("/")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidPort() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .port("99999")
                .path("/")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidZeroPort() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .port("0")
                .path("/")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidPathWithoutLeadingSlash() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .port("80")
                .path("ws")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidPathContainsWhitespace() {
        WebsocketProtocol protocol = WebsocketProtocol.builder()
                .host("127.0.0.1")
                .port("80")
                .path("/chat room")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
