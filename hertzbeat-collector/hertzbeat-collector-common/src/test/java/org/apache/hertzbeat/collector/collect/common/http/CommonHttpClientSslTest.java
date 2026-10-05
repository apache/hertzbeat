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

package org.apache.hertzbeat.collector.collect.common.http;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Tests for CommonHttpClient TLS protocol configuration.
 */
class CommonHttpClientSslTest {

    @Test
    void supportedSslProtocolsIncludeTls13AndExcludeSslv3() {
        String[] protocols = CommonHttpClient.supportedSslProtocolsForTest();
        List<String> protocolList = Arrays.asList(protocols);

        assertTrue(protocolList.contains("TLSv1.3"));
        assertFalse(protocolList.contains("SSLv3"));
        assertArrayEquals(new String[]{"TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"}, protocols);
    }
}
