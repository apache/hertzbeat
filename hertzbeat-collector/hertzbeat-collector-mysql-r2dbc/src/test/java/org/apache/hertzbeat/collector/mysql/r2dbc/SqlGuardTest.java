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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class SqlGuardTest {

    private final SqlGuard sqlGuard = new SqlGuard();

    @Test
    void shouldNormalizeTrailingSemicolon() {
        assertEquals("SELECT 1", sqlGuard.normalizeAndValidate("SELECT 1;"));
    }

    @Test
    void shouldAllowShowStatement() {
        assertEquals("SHOW VARIABLES LIKE 'version%'", sqlGuard.normalizeAndValidate("SHOW VARIABLES LIKE 'version%'"));
    }

    @Test
    void shouldRejectWriteStatement() {
        assertThrows(IllegalArgumentException.class, () -> sqlGuard.normalizeAndValidate("DELETE FROM test"));
    }

    @Test
    void shouldRejectMultipleStatements() {
        assertThrows(IllegalArgumentException.class, () -> sqlGuard.normalizeAndValidate("SELECT 1; SELECT 2"));
    }

    @Test
    void shouldRejectComments() {
        assertThrows(IllegalArgumentException.class, () -> sqlGuard.normalizeAndValidate("SELECT 1 -- comment"));
    }
}
