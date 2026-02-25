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

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

/**
 * Test for {@link MapCapUtil}
 */
class MapCapUtilTest {

    @Test
    public void testCalInitMap() {
        int size = 0;
        int expectedCapacity = (int) Math.ceil(size / 0.75);
        int actualCapacity = MapCapUtil.calInitMap(size);

        assertEquals(expectedCapacity, actualCapacity);

        size = 10;
        expectedCapacity = (int) Math.ceil(size / 0.75);
        actualCapacity = MapCapUtil.calInitMap(size);

        assertEquals(expectedCapacity, actualCapacity);
    }

}
