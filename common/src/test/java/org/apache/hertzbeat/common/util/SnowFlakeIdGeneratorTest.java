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

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link SnowFlakeIdGenerator}
 */
class SnowFlakeIdGeneratorTest {

    @Test
    void generateId() {
        // Note that because the front-end JS TS parses large numbers in json,
        // the precision will be lost. UUID cannot exceed hexadecimal 0x1FFFFFFFFFFFFFF (less than 53bit)
        for (int i = 0; i < 10000; i++) {
            long id = SnowFlakeIdGenerator.generateId();
            Assertions.assertTrue(id < 0x1FFFFFFFFFFFFFL);
        }
    }
}
