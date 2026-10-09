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

    /**
     * `CCJSqlParserUtil.parse` returns the first statement and silently discards the rest,
     * so a stacked statement used to validate as a plain select while the caller still
     * handed the whole string to the database.
     */
    @Test
    void testStackedStatementIsRejected() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * FROM hertzbeat_logs; DROP TABLE hertzbeat_logs"));
        assertThrows(SqlSecurityException.class, () -> SqlSecurityValidator.selectOnly().validate(
            "SELECT 1; DROP TABLE cpu"));
        assertThrows(SqlSecurityException.class, () -> SqlSecurityValidator.selectOnly().validate(
            "SELECT $$--$$; DROP TABLE cpu"));
        assertThrows(SqlSecurityException.class, () -> SqlSecurityValidator.selectOnly().validate(
            "SELECT $body$--$body$; DROP TABLE cpu"));
    }

    @Test
    void testTrailingSemicolonIsStillAcceptedAsOneStatement() {
        assertDoesNotThrow(() -> validator.validate("SELECT * FROM hertzbeat_logs ; "));
    }

    @Test
    void testSelectOnlyRejectsWrites() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("DROP TABLE cpu"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("DELETE FROM cpu"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("INSERT INTO cpu VALUES (1)"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("UPDATE cpu SET value = 1"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("TRUNCATE TABLE cpu"));
    }

    /**
     * Metric tables are created per metric on demand, so this mode constrains what a
     * statement may do, not which table it may touch.
     */
    @Test
    void testSelectOnlyAcceptsAnyTableAndNestedReads() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertDoesNotThrow(() -> selectOnly.validate("SELECT value FROM any_metric_table"));
        assertDoesNotThrow(() -> selectOnly.validate(
            "SELECT value FROM cpu WHERE host = (SELECT host FROM hosts LIMIT 1)"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT a FROM t1 UNION ALL SELECT b FROM t2"));
    }

    /**
     * The only sql executor today talks to GreptimeDB, whose range query syntax JSqlParser
     * cannot parse. These are ordinary reads and used to run, so read only mode has to keep
     * accepting them rather than turn a richer dialect into a rule that no longer fires.
     */
    @Test
    void testSelectOnlyAcceptsDialectTheParserDoesNotUnderstand() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertDoesNotThrow(() -> selectOnly.validate(
            "SELECT ts, avg(value) RANGE '10s' FROM cpu ALIGN '5s' FILL LINEAR"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu ALIGN '5s'"));
    }

    /**
     * Accepting what the parser cannot read must not become a way through: the statement
     * count and the leading keyword are established without the parser, so they still hold
     * for a string it never understood.
     */
    @Test
    void testUnparsableStatementMustStillBeOneRead() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "SELECT avg(value) RANGE '10s' FROM cpu ALIGN '5s'; DROP TABLE cpu"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("DROP TABLE cpu ALIGN '5s'"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("TQL EVAL (0, 10, '5s') sum(cpu)"));
    }

    /**
     * A semicolon that is data or commentary is not a statement separator, and a statement
     * scan that cannot tell the difference would reject ordinary queries.
     */
    @Test
    void testSemicolonInsideLiteralOrCommentDoesNotSplitTheStatement() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu WHERE msg = 'a; DROP TABLE cpu'"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu WHERE msg = 'it''s; fine'"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu -- ; DROP TABLE cpu"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu /* ; DROP TABLE cpu */ LIMIT 1"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT value FROM \"cpu;usage\""));
    }

    @Test
    void testUnclosedLiteralOrCommentIsRejected() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT * FROM cpu WHERE msg = 'open"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT * FROM cpu /* open"));
    }

    /**
     * A dollar-quoted literal is refused outright rather than skipped over, so that neither
     * answer to "does this dialect have dollar quoting" can hide a statement.
     *
     * <p>Skipping would lose a stacked statement to a dialect that has it, since the comment
     * marker in {@code SELECT $$--$$; DROP TABLE cpu} is data rather than a comment. Skipping
     * would equally lose one to a dialect that does not, since the semicolon in
     * {@code SELECT 1 $$;DROP TABLE cpu$$} really does separate statements there.
     */
    @Test
    void testDollarQuotedLiteralIsRejectedRatherThanSkipped() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT $$--$$; DROP TABLE cpu"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT 1 $$;DROP TABLE cpu$$"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT 1 $t$;DROP TABLE cpu$t$"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT $$a; -- DROP TABLE cpu$$"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT $body$a; -- DROP TABLE cpu$body$"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT $$open"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT $body$open"));
        // a literal opening right after an identifier is still a literal
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate("SELECT a$$b;c$$ FROM cpu"));
    }

    /**
     * A dollar sign that opens nothing is an ordinary character, so reads keep working.
     */
    @Test
    void testLoneDollarSignIsNotTreatedAsLiteral() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertDoesNotThrow(() -> selectOnly.validate("SELECT $1 FROM cpu"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT a$b FROM cpu"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu WHERE cost = '$5; x'"));
    }

    /**
     * `SELECT ... INTO` parses as a select but writes a table in the dialects that support it.
     */
    @Test
    void testSelectOnlyRejectsSelectInto() {
        assertThrows(SqlSecurityException.class, () -> SqlSecurityValidator.selectOnly()
            .validate("SELECT * INTO backup FROM cpu"));
    }

    @Test
    void testSelectOnlyAcceptsCte() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertDoesNotThrow(() -> selectOnly.validate("WITH x AS (SELECT 1 AS v) SELECT * FROM x"));
        assertDoesNotThrow(() -> selectOnly.validate(
            "WITH x AS (SELECT avg(v) RANGE '10s' FROM cpu ALIGN '5s') SELECT * FROM x"));
    }

    /**
     * An outermost node that is a plain select proves nothing about the rest of the tree: a
     * write hides in a cte, in a branch of a set operation, or in a subquery, and JSqlParser
     * reports the outermost node of all three as a select.
     */
    @Test
    void testSelectOnlyRejectsWritesNestedInsideReads() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "WITH x AS (DELETE FROM cpu RETURNING *) SELECT * FROM x"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "WITH x AS (INSERT INTO cpu VALUES (1) RETURNING *) SELECT * FROM x"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "WITH x AS (SELECT id FROM t) DELETE FROM cpu WHERE id IN (SELECT id FROM x)"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "SELECT * INTO backup FROM cpu UNION SELECT * FROM cpu"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "SELECT * FROM cpu UNION SELECT * INTO backup FROM cpu"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "SELECT * FROM (SELECT * INTO backup FROM cpu) t"));
    }

    /**
     * The nested writes above have to stay rejected when the parser cannot read the dialect
     * and there is no tree to walk, which is the case the whole read only mode exists for.
     */
    @Test
    void testNestedWritesStayRejectedWithoutTheParser() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "SELECT * FROM (DELETE FROM cpu RETURNING *) t ALIGN '5s'"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "WITH x AS (DELETE FROM cpu RETURNING *) SELECT avg(v) RANGE '10s' FROM x ALIGN '5s'"));
        assertThrows(SqlSecurityException.class, () -> selectOnly.validate(
            "SELECT * INTO backup FROM cpu ALIGN '5s'"));
    }

    /**
     * The word scan matches whole words only, so ordinary reads whose identifiers or functions
     * merely contain one keep working. An identifier that collides outright can be quoted.
     */
    @Test
    void testWriteWordScanDoesNotCatchOrdinaryReads() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();
        assertDoesNotThrow(() -> selectOnly.validate("SELECT delete_count, insert_rate FROM cpu"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT truncate(value, 2) FROM cpu"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT replace(msg, 'a', 'b') FROM logs"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT * FROM cpu WHERE msg = 'drop table cpu'"));
        assertDoesNotThrow(() -> selectOnly.validate("SELECT \"drop\" FROM cpu"));
    }

    /**
     * The whitelist says which tables a statement may touch, so on its own it lets a write
     * through as long as every table it names is allowed.
     */
    @Test
    void testWhitelistModeRejectsSelectIntoOnAnAllowedTable() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT * INTO backup FROM hertzbeat_logs"));
    }

    /**
     * The whitelisting mode needs the parse tree to enumerate table names, so unlike read
     * only mode it has nothing to fall back on and keeps rejecting what it cannot parse.
     */
    @Test
    void testWhitelistModeStillRejectsWhatItCannotParse() {
        assertThrows(SqlSecurityException.class, () -> validator.validate(
            "SELECT avg(value) RANGE '10s' FROM hertzbeat_logs ALIGN '5s'"));
    }

    @Test
    void testSelectOnlyCannotEscapeTheConfiguredDatabase() {
        final SqlSecurityValidator selectOnly = SqlSecurityValidator.selectOnly();

        assertThrows(SqlSecurityException.class,
            () -> selectOnly.validate("SELECT * FROM information_schema.tables"));
        assertThrows(SqlSecurityException.class,
            () -> selectOnly.validate("SELECT * FROM pg_catalog.pg_tables"));
        assertThrows(SqlSecurityException.class,
            () -> selectOnly.validate("SELECT * FROM public.cpu"));
        assertThrows(SqlSecurityException.class,
            () -> selectOnly.validate("SELECT * FROM \"information_schema\".\"tables\""));
        assertThrows(SqlSecurityException.class,
            () -> selectOnly.validate(
                "SELECT * FROM cpu, information_schema.tables RANGE '1m' ALIGN '1m'"));
    }
}
