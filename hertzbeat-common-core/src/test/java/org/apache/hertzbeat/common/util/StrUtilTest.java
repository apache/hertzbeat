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

import static org.apache.hertzbeat.common.util.StrUtil.analysisArgToList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link StrUtil}
 */
class StrUtilTest {

    @Test
    void testAnalysisArgToList() {
        List<String> result = analysisArgToList(null);
        assertTrue(result.isEmpty());

        result = analysisArgToList("");
        assertEquals(1, result.size());
        assertEquals("", result.get(0));

        result = analysisArgToList("element");
        assertEquals(1, result.size());
        assertEquals("element", result.get(0));

        result = analysisArgToList("one,two,three");
        assertEquals(3, result.size());
        assertEquals("one", result.get(0));
        assertEquals("two", result.get(1));
        assertEquals("three", result.get(2));

        result = analysisArgToList(" one , two , three ");
        assertEquals(3, result.size());
        assertEquals("one", result.get(0).trim());
        assertEquals("two", result.get(1).trim());
        assertEquals("three", result.get(2).trim());

        result = analysisArgToList(",one,two,three,");
        assertEquals(4, result.size());
        assertEquals("", result.get(0));
        assertEquals("one", result.get(1));
        assertEquals("two", result.get(2));
        assertEquals("three", result.get(3));
    }

}
