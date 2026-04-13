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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

class MysqlSqlTemplateCompatibilityTest {

    private final SqlGuard sqlGuard = new SqlGuard();

    @Test
    @SuppressWarnings("unchecked")
    void shouldAcceptCurrentOfficialMysqlTemplateSql() throws IOException {
        Path template = Path.of("..", "..", "hertzbeat-manager", "src", "main", "resources", "define", "app-mysql.yml")
                .toAbsolutePath()
                .normalize();
        assertTrue(Files.isRegularFile(template), "MySQL monitor template must exist");

        Yaml yaml = new Yaml();
        int sqlCount = 0;
        try (Reader reader = Files.newBufferedReader(template)) {
            Map<String, Object> root = yaml.load(reader);
            List<Map<String, Object>> metrics = (List<Map<String, Object>>) root.get("metrics");
            for (Map<String, Object> metric : metrics) {
                Map<String, Object> jdbc = (Map<String, Object>) metric.get("jdbc");
                if (jdbc == null) {
                    continue;
                }
                Object sql = jdbc.get("sql");
                if (!(sql instanceof String sqlText)) {
                    continue;
                }
                String normalized = sqlGuard.normalizeAndValidate(sqlText);
                assertFalse(normalized.isBlank(), "Normalized SQL should not be blank");
                sqlCount++;
            }
        }
        assertTrue(sqlCount > 0, "MySQL monitor template should contain SQL statements");
    }
}
