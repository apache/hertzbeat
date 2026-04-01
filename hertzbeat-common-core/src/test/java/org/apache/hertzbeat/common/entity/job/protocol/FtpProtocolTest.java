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

class FtpProtocolTest {

    @Test
    void isInvalidValidAnonymousFtp() {
        FtpProtocol protocol = FtpProtocol.builder()
                .host("ftp.example.com")
                .port("21")
                .direction("/")
                .timeout("3000")
                .ssl("false")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidValidSftp() {
        FtpProtocol protocol = FtpProtocol.builder()
                .host("sftp.example.com")
                .port("22")
                .direction("/data")
                .timeout("3000")
                .ssl("true")
                .username("admin")
                .password("secret")
                .build();
        assertFalse(protocol.isInvalid());
    }

    @Test
    void isInvalidMissingDirection() {
        FtpProtocol protocol = FtpProtocol.builder()
                .host("ftp.example.com")
                .port("21")
                .timeout("3000")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidUnsupportedSslValue() {
        FtpProtocol protocol = FtpProtocol.builder()
                .host("ftp.example.com")
                .port("21")
                .direction("/")
                .timeout("3000")
                .ssl("yes")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidSftpWithoutPassword() {
        FtpProtocol protocol = FtpProtocol.builder()
                .host("sftp.example.com")
                .port("22")
                .direction("/data")
                .timeout("3000")
                .ssl("true")
                .username("admin")
                .build();
        assertTrue(protocol.isInvalid());
    }

    @Test
    void isInvalidInvalidTimeout() {
        FtpProtocol protocol = FtpProtocol.builder()
                .host("ftp.example.com")
                .port("21")
                .direction("/")
                .timeout("abc")
                .build();
        assertTrue(protocol.isInvalid());
    }
}
