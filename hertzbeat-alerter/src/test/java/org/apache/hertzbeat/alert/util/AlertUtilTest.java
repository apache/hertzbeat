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

package org.apache.hertzbeat.alert.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AlertUtil}.
 */
class AlertUtilTest {

    @Test
    void calculateFingerprintPreservesLabelPairing() {
        Map<String, String> first = new LinkedHashMap<>();
        first.put("environment", "production");
        first.put("team", "payments");

        Map<String, String> swapped = new LinkedHashMap<>();
        swapped.put("environment", "payments");
        swapped.put("team", "production");

        assertNotEquals(
                AlertUtil.calculateFingerprint(first),
                AlertUtil.calculateFingerprint(swapped));
    }

    @Test
    void calculateFingerprintIsIndependentOfMapIterationOrder() {
        Map<String, String> first = new LinkedHashMap<>();
        first.put("environment", "production");
        first.put("team", "payments");

        Map<String, String> reversed = new LinkedHashMap<>();
        reversed.put("team", "payments");
        reversed.put("environment", "production");

        assertEquals(
                AlertUtil.calculateFingerprint(first),
                AlertUtil.calculateFingerprint(reversed));
    }
}
