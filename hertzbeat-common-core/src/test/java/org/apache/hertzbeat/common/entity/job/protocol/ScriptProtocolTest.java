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

class ScriptProtocolTest {

    @Test
    void isInvalidValidScriptCommand() {
        ScriptProtocol protocol = ScriptProtocol.builder()
                .charset("UTF-8")
                .parseType("oneRow")
                .scriptTool("bash")
                .scriptCommand("echo test")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidScriptPath() {
        ScriptProtocol protocol = ScriptProtocol.builder()
                .charset("UTF-8")
                .parseType("multiRow")
                .scriptTool("powershell")
                .scriptPath("/tmp/test.ps1")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedCharset() {
        ScriptProtocol protocol = ScriptProtocol.builder()
                .charset("not-a-charset")
                .parseType("oneRow")
                .scriptTool("bash")
                .scriptCommand("echo test")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedParseType() {
        ScriptProtocol protocol = ScriptProtocol.builder()
                .charset("UTF-8")
                .parseType("json")
                .scriptTool("bash")
                .scriptCommand("echo test")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedScriptTool() {
        ScriptProtocol protocol = ScriptProtocol.builder()
                .charset("UTF-8")
                .parseType("oneRow")
                .scriptTool("sh")
                .scriptCommand("echo test")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidMissingCommandAndPath() {
        ScriptProtocol protocol = ScriptProtocol.builder()
                .charset("UTF-8")
                .parseType("oneRow")
                .scriptTool("bash")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
