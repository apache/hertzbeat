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

import java.util.List;
import org.junit.jupiter.api.Test;

class NgqlProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        NgqlProtocol protocol = NgqlProtocol.builder()
                .host("127.0.0.1")
                .port("9669")
                .username("root")
                .password("nebula")
                .timeout("6000")
                .parseType("oneRow")
                .commands(List.of("SHOW HOSTS;"))
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedParseType() {
        NgqlProtocol protocol = NgqlProtocol.builder()
                .host("127.0.0.1")
                .port("9669")
                .username("root")
                .password("nebula")
                .timeout("6000")
                .parseType("json")
                .commands(List.of("SHOW HOSTS;"))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidEmptyCommands() {
        NgqlProtocol protocol = NgqlProtocol.builder()
                .host("127.0.0.1")
                .port("9669")
                .username("root")
                .password("nebula")
                .timeout("6000")
                .parseType("oneRow")
                .commands(List.of())
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidBlankCommandItem() {
        NgqlProtocol protocol = NgqlProtocol.builder()
                .host("127.0.0.1")
                .port("9669")
                .username("root")
                .password("nebula")
                .timeout("6000")
                .parseType("oneRow")
                .commands(List.of(" "))
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        NgqlProtocol protocol = NgqlProtocol.builder()
                .host("127.0.0.1")
                .port("9669")
                .username("root")
                .password("nebula")
                .timeout("abc")
                .parseType("oneRow")
                .commands(List.of("SHOW HOSTS;"))
                .build();
        assertTrue(protocol.isInvalid());
    }
}
