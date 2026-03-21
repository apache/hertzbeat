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

package org.apache.hertzbeat.collector.collect.mysql;

import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.testcontainers.utility.DockerImageName;

/**
 * Compatibility E2E coverage for the collector-side MySQL R2DBC adapter.
 */
class MysqlR2dbcCollectCompatibilityE2eTest extends AbstractMysqlR2dbcCollectE2eTest {

    private static final Set<String> MARIADB_REPRESENTATIVE_METRICS =
            Set.of("basic", "process_state", "slow_sql");

    @TestFactory
    Stream<DynamicTest> shouldCollectMysqlTemplateAcrossCompatibilityMatrixWithoutMysqlJdbcDriver() {
        return Stream.of(
                        new MatrixTarget(
                                new DatabaseTarget("mysql-5.7.44", DockerImageName.parse("mysql:5.7.44"), false),
                                null),
                        new MatrixTarget(
                                new DatabaseTarget("mysql-8.0.36", DockerImageName.parse("mysql:8.0.36"), false),
                                null),
                        new MatrixTarget(
                                new DatabaseTarget("mariadb-11.4", DockerImageName.parse("mariadb:11.4"), true),
                                MARIADB_REPRESENTATIVE_METRICS))
                .map(target -> DynamicTest.dynamicTest(target.databaseTarget().name(), () -> verifyTarget(target)));
    }

    private void verifyTarget(MatrixTarget target) throws Exception {
        setUpTarget(target.databaseTarget());
        try {
            assertMysqlJdbcDriverAbsent();
            collectMysqlTemplate(target.metricFilter());
        } finally {
            tearDownTarget();
        }
    }

    private record MatrixTarget(DatabaseTarget databaseTarget, Set<String> metricFilter) {
    }
}
