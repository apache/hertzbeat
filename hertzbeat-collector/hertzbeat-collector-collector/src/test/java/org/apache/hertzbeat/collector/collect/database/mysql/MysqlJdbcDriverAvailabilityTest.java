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

package org.apache.hertzbeat.collector.collect.database.mysql;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MysqlJdbcDriverAvailabilityTest {

    @Test
    void shouldTreatOnlyExtLibLocationsAsAutoJdbcSignal() {
        assertTrue(MysqlJdbcDriverAvailability.isExtLibLocation("/opt/hertzbeat/ext-lib/mysql-connector-j-9.0.0.jar"));
        assertTrue(MysqlJdbcDriverAvailability.isExtLibLocation("file:/C:/hertzbeat/ext-lib/mysql-connector-j-9.0.0.jar"));
        assertFalse(MysqlJdbcDriverAvailability.isExtLibLocation("/Users/dev/.m2/repository/com/mysql/mysql-connector-j/9.0.0/mysql-connector-j-9.0.0.jar"));
        assertFalse(MysqlJdbcDriverAvailability.isExtLibLocation(null));
    }

    @Test
    void shouldIgnoreTestClasspathMysqlDriverWhenItIsNotFromExtLib() {
        MysqlJdbcDriverAvailability availability = new MysqlJdbcDriverAvailability();

        assertFalse(availability.hasMysqlJdbcDriver());
    }
}
