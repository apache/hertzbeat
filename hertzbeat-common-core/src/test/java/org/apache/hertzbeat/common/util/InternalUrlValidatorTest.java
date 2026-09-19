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

package org.apache.hertzbeat.common.util;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Test case for {@link InternalUrlValidator}
 */
class InternalUrlValidatorTest {

    @Test
    void testNullAndBlankRejected() {
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate((String) null));
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate(""));
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate("   "));
    }

    @Test
    void testSchemeRestrictedToHttpAndHttps() {
        assertDoesNotThrow(() -> InternalUrlValidator.validate("http://8.8.8.8/"));
        assertDoesNotThrow(() -> InternalUrlValidator.validate("https://8.8.8.8/"));
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate("ftp://8.8.8.8/"));
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate("file:///etc/passwd"));
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate("gopher://8.8.8.8/"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        // loopback IPv4
        "http://127.0.0.1/",
        "http://127.255.255.255/",
        "http://localhost/",
        // loopback IPv6
        "http://[::1]/",
        // link-local IPv4 (169.254.0.0/16) — cloud metadata attack vector
        "http://169.254.169.254/latest/meta-data/",
        "http://169.254.1.1/",
        // link-local IPv6 (fe80::/10)
        "http://[fe80::1]/",
        // RFC-1918 private ranges
        "http://10.0.0.1/",
        "http://10.255.255.255/",
        "http://172.16.0.1/",
        "http://172.31.255.255/",
        "http://192.168.1.1/",
        "http://192.168.255.255/",
        // any-local / unspecified
        "http://0.0.0.0/",
        "http://[::]/",
        // multicast
        "http://224.0.0.1/",
        "http://255.255.255.255/",
        // reserved 240.0.0.0/4
        "http://240.0.0.1/",
        "http://255.255.255.254/",
        // CGNAT shared address space 100.64.0.0/10
        "http://100.64.0.1/",
        "http://100.127.255.254/",
        // documentation prefixes (should never be routed to)
        "http://192.0.2.1/",
        "http://198.51.100.1/",
        "http://203.0.113.1/",
        "http://192.0.0.1/",
        // IPv6 ULA fc00::/7
        "http://[fc00::1]/",
        "http://[fd00::1]/",
        // IPv6 documentation prefix
        "http://[2001:db8::1]/"
    })
    void testInternalAndReservedAddressesRejected(String url) {
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate(url),
            "Expected rejection for: " + url);
    }

    @ParameterizedTest
    @ValueSource(strings = {
        // public IPv4 addresses
        "http://8.8.8.8/",
        "http://1.1.1.1/",
        "https://93.184.216.34/",
        // public IPv6 (Google DNS)
        "http://[2001:4860:4860::8888]/",
        // with port and path
        "https://8.8.8.8:443/api/webhook",
        "http://93.184.216.34:8080/notify?token=abc"
    })
    void testPublicAddressesAccepted(String url) {
        assertDoesNotThrow(() -> InternalUrlValidator.validate(url),
            "Expected acceptance for: " + url);
    }

    @Test
    void testMalformedUrlRejected() {
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate("not a url"));
        assertThrows(IllegalArgumentException.class, () -> InternalUrlValidator.validate("http://"));
    }
}
