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

package org.apache.hertzbeat.manager.service.helper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class MonitorInstanceCanonicalizerTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            [::1] | 443 | [::1]:443
            ::1 | 443 | [::1]:443
            [::1]:8443 | 443 | [::1]:8443
            https://example.com/path | 443 | https://example.com:443/path
            https://example.com:8443/path | 443 | https://example.com:8443/path
            example.com | 443 | example.com:443
            example.com:8443 | 443 | example.com:8443
            """)
    void canonicalizesStaticAuthority(String host, String port, String expected) {
        assertEquals(expected, MonitorInstanceCanonicalizer.canonicalize(true, host, port));
    }

    @ParameterizedTest
    @CsvSource({"client-value", "unknow:443", "''"})
    void canonicalizesServiceDiscoveryToStableLegacyPlaceholder(String clientValue) {
        assertEquals("unknow", MonitorInstanceCanonicalizer.canonicalize(false, clientValue, "443"));
    }
}
