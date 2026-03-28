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

class ImapProtocolTest {

    @Test
    void isInvalidValidProtocol() {
        ImapProtocol protocol = ImapProtocol.builder()
                .host("imap.example.com")
                .port("993")
                .timeout("6000")
                .ssl("true")
                .email("test@example.com")
                .authorize("auth-code")
                .folderName("INBOX")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidMissingFolderName() {
        ImapProtocol protocol = ImapProtocol.builder()
                .host("imap.example.com")
                .port("993")
                .timeout("6000")
                .email("test@example.com")
                .authorize("auth-code")
                .folderName("")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedSslValue() {
        ImapProtocol protocol = ImapProtocol.builder()
                .host("imap.example.com")
                .port("993")
                .timeout("6000")
                .ssl("yes")
                .email("test@example.com")
                .authorize("auth-code")
                .folderName("INBOX")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        ImapProtocol protocol = ImapProtocol.builder()
                .host("imap.example.com")
                .port("993")
                .timeout("abc")
                .email("test@example.com")
                .authorize("auth-code")
                .folderName("INBOX")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidHost() {
        ImapProtocol protocol = ImapProtocol.builder()
                .host("")
                .port("993")
                .timeout("6000")
                .email("test@example.com")
                .authorize("auth-code")
                .folderName("INBOX")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
