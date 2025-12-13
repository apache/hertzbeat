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

package org.apache.hertzbeat.common.support.valid;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test for {@link SqlSecurityValidator}
 */
class SqlSecurityValidatorTest {

    private SqlSecurityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new SqlSecurityValidator(Arrays.asList("hertzbeat_logs", "app_logs", "access_logs"));
    }

    @Test
    void testValidSelectStatement() {
        assertDoesNotThrow(() -> validator.validate("SELECT * FROM hertzbeat_logs"));
        assertDoesNotThrow(() -> validator.validate("SELECT id, message FROM hertzbeat_logs WHERE level = 'ERROR'"));
        assertDoesNotThrow(() -> validator.validate("SELECT COUNT(*) FROM app_logs"));
        assertDoesNotThrow(() -> validator.validate("select * from HERTZBEAT_LOGS")); // case insensitive
    }

    @Test
    void testSelectWithJoin() {
        assertDoesNotThrow(() -> validator.validate(
                "SELECT a.id, b.message FROM hertzbeat_logs a JOIN app_logs b ON a.id = b.id"));
    }

    @Test
    void testSelectWithSubqueryNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs WHERE id IN (SELECT id FROM app_logs)"));
    }

    @Test
    void testSelectWithSubqueryInFromNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM (SELECT * FROM hertzbeat_logs) AS subq"));
    }

    @Test
    void testEmptySql() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(null));
        assertThrows(SqlSecurityException.class, () -> validator.validate(""));
        assertThrows(SqlSecurityException.class, () -> validator.validate("   "));
    }

    @Test
    void testInvalidSqlSyntax() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FORM hertzbeat_logs")); // typo: FORM instead of FROM
    }

    @Test
    void testInsertNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("INSERT INTO hertzbeat_logs (message) VALUES ('test')"));
    }

    @Test
    void testUpdateNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("UPDATE hertzbeat_logs SET message = 'test' WHERE id = 1"));
    }

    @Test
    void testDeleteNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("DELETE FROM hertzbeat_logs WHERE id = 1"));
    }

    @Test
    void testDropNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("DROP TABLE hertzbeat_logs"));
    }

    @Test
    void testTruncateNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("TRUNCATE TABLE hertzbeat_logs"));
    }

    @Test
    void testAlterNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("ALTER TABLE hertzbeat_logs ADD COLUMN new_col VARCHAR(100)"));
    }

    @Test
    void testCreateNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("CREATE TABLE new_table (id INT)"));
    }

    @Test
    void testUnauthorizedTable() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM users"));
    }

    @Test
    void testUnauthorizedTableInJoin() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs JOIN users ON hertzbeat_logs.user_id = users.id"));
    }

    @Test
    void testUnauthorizedTableInSubquery() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs WHERE user_id IN (SELECT id FROM users)"));
    }

    @Test
    void testTableWithQuotes() {
        assertDoesNotThrow(() -> validator.validate("SELECT * FROM \"hertzbeat_logs\""));
        assertDoesNotThrow(() -> validator.validate("SELECT * FROM `hertzbeat_logs`"));
    }

    @Test
    void testEmptyAllowedTables() {
        SqlSecurityValidator emptyValidator = new SqlSecurityValidator(Collections.emptyList());
        assertThrows(SqlSecurityException.class,
                () -> emptyValidator.validate("SELECT * FROM any_table"));
    }

    @Test
    void testNullAllowedTables() {
        SqlSecurityValidator nullValidator = new SqlSecurityValidator(null);
        assertThrows(SqlSecurityException.class,
                () -> nullValidator.validate("SELECT * FROM any_table"));
    }

    @Test
    void testComplexSelectWithAggregation() {
        assertDoesNotThrow(() -> validator.validate(
                "SELECT level, COUNT(*) as cnt FROM hertzbeat_logs GROUP BY level HAVING COUNT(*) > 10 ORDER BY cnt DESC LIMIT 100"));
    }

    @Test
    void testSelectWithUnionNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs UNION SELECT * FROM app_logs"));
    }

    @Test
    void testSelectWithUnionAllNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs UNION ALL SELECT * FROM app_logs"));
    }

    @Test
    void testSelectWithIntersectNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs INTERSECT SELECT * FROM app_logs"));
    }

    @Test
    void testSelectWithExceptNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs EXCEPT SELECT * FROM app_logs"));
    }

    @Test
    void testLateralSubqueryNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM hertzbeat_logs, LATERAL (SELECT * FROM app_logs) AS t"));
    }

    @Test
    void testWithClauseNotAllowed() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("WITH cte AS (SELECT * FROM hertzbeat_logs) SELECT * FROM cte"));
    }

    @Test
    void testSqlInjectionAttemptDropTable() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("DROP TABLE users"));
    }

    @Test
    void testSqlInjectionAttemptUnauthorizedTable() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("SELECT * FROM users"));
    }

    @Test
    void testSqlInjectionAttemptDeleteFrom() {
        assertThrows(SqlSecurityException.class,
                () -> validator.validate("DELETE FROM hertzbeat_logs WHERE 1=1"));
    }

    @Test
    void testBypassInSelectItems() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT (SELECT password FROM secret_table) FROM hertzbeat_logs"));
    }

    @Test
    void testBypassInWhereClauseAnd() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE 1=1 AND id IN (SELECT id FROM secret_table)"));
    }

    @Test
    void testBypassInFunction() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE id = abs((SELECT count(*) FROM secret_table))"));
    }

    @Test
    void testBypassInCaseWhen() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE status = (CASE WHEN (SELECT 1 FROM secret_table)=1 THEN 1 ELSE 0 END)"));
    }

    @Test
    void testBypassWithAndExpression() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE 1=1 AND id = (SELECT id FROM secret_table)"));
    }

    @Test
    void testBypassWithGreaterThan() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE id > (SELECT count(*) FROM secret_table)"));
    }

    @Test
    void testBypassWithBetween() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE id BETWEEN 1 AND (SELECT id FROM secret_table)"));
    }

    @Test
    void testBypassWithMathOperations() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs WHERE id = 1 + (SELECT id FROM secret_table)"));
    }
}
