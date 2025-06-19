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

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test case for {@link CryptoUtils}
 */
public class CryptoUtilsTest {


    @Test
    void testSha256Hex() {
        String sign = CryptoUtils.sha256Hex("Hello world.");
        assertEquals("aa3ec16e6acc809d8b2818662276256abfd2f1b441cb51574933f3d4bd115d11", sign);
    }

    @Test
    void testHmacSha256Base64Debug() {
        String signature = CryptoUtils.hmacSha256Base64("your-real-key", "your-real-data");
        assertEquals("8JrfX0v5Tt3s8PfI85o6jcf5XM3C+vLlMwvFp45LupU=", signature);
    }

    @Test
    void testHmacSha256Hex() {
        String signature = CryptoUtils.hmacSha256Hex("your-real-key", "your-real-data");;
        assertEquals("41878ccd7ecd795a2dd7ec39be7f33fed4be3ec75f5307689e39dd6f41fdbaac", signature);
    }

}