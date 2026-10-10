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

package org.apache.hertzbeat.manager.setup.api;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Freezes operation identifiers to the deployment frontend path-segment contract. */
class OperationIdValidatorTest {

    @Test
    void acceptsOnlyFrontendCompatibleOperationIds() {
        assertTrue(OperationIdValidator.isSafe("a"));
        assertTrue(OperationIdValidator.isSafe("a.b_c-d"));
        assertTrue(OperationIdValidator.isSafe("a".repeat(128)));

        assertFalse(OperationIdValidator.isSafe(".hidden"));
        assertFalse(OperationIdValidator.isSafe("-id"));
        assertFalse(OperationIdValidator.isSafe("_id"));
        assertFalse(OperationIdValidator.isSafe("~id"));
        assertFalse(OperationIdValidator.isSafe("a~b"));
        assertFalse(OperationIdValidator.isSafe("a".repeat(129)));
    }
}
