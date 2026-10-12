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

package org.apache.hertzbeat.common.observability.dto.log;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LogSeverityCategoryTest {
    @Test
    void categoriesCoverAllFourOtelNumbersWithoutTextAliases() {
        for (LogSeverityCategory category : LogSeverityCategory.values()) {
            assertEquals(4, category.maximum() - category.minimum() + 1);
            for (int number = 0; number <= 25; number++) {
                assertEquals(number >= category.minimum() && number <= category.maximum(), category.matches(number));
            }
            assertFalse(category.matches(null));
        }
        assertTrue(LogSeverityCategory.ERROR.matches(17));
        assertTrue(LogSeverityCategory.ERROR.matches(20));
        assertFalse(LogSeverityCategory.ERROR.matches(21));
    }

    @Test
    void parserRejectsInvalidCategoriesButAllowsAnAbsentFilter() {
        assertNull(LogSeverityCategory.parse(null));
        assertEquals(LogSeverityCategory.ERROR, LogSeverityCategory.parse("ERROR"));
        assertThrows(IllegalArgumentException.class, () -> LogSeverityCategory.parse("SEVERE"));
        assertThrows(IllegalArgumentException.class, () -> LogSeverityCategory.parse(""));
    }
}
