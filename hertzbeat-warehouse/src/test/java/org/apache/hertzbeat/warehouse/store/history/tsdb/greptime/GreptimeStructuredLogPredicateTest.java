/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 * See the NOTICE file distributed with this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Domain;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Field;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Not;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Operator;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Or;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchExpression.Term;
import org.junit.jupiter.api.Test;

class GreptimeStructuredLogPredicateTest {
    @Test
    void preservesBooleanGroupingAndNullSafeNegation() {
        var left = new Term(new Field(Domain.BUILTIN, "service"), Operator.EQUALS, "checkout");
        var right = new Term(new Field(Domain.ATTRIBUTE, "http.status_code"), Operator.GTE, "500");
        String sql = GreptimeStructuredLogPredicate.compile(new Not(new Or(List.of(left, right))));
        assertTrue(sql.startsWith("(NOT ("));
        assertTrue(sql.contains(" OR "));
        assertTrue(sql.contains("COALESCE("));
        assertTrue(sql.contains("TRY_CAST("));
        assertFalse(sql.contains("json_get_float"));
    }

    @Test
    void quotesLiteralFieldsAndPreservesCaseAndWhitespace() {
        String sql = GreptimeStructuredLogPredicate.compile(new Term(new Field(Domain.ATTRIBUTE, "message.key"), Operator.EQUALS, " ERROR's "));
        assertTrue(sql.contains("'$[\"message.key\"]'"));
        assertTrue(sql.contains("' ERROR''s '"));
        assertFalse(sql.contains("LOWER"));
        assertFalse(sql.contains("TRIM"));
    }

    @Test
    void globUsesUnicodeSpecialCharacterAndLiteralEscapes() {
        String sql = GreptimeStructuredLogPredicate.compile(new Term(new Field(Domain.ATTRIBUTE, "path"), Operator.GLOB, "a?b*\\*._%"));
        assertTrue(sql.contains("[^\\p{L}\\p{N}]"));
        assertTrue(sql.contains(".*"));
        assertTrue(sql.contains("\\*"));
        assertTrue(sql.contains("\\."));
    }

    @Test
    void freeTextFoldsCaseWhileTypedTermRemainsCaseSensitive() {
        String sql = GreptimeStructuredLogPredicate.compile(new Term(
                new Field(Domain.ATTRIBUTE, "title"), Operator.FULL_TEXT_TERM, "Timeout"));
        assertTrue(sql.contains("matches_term(lower(json_get_string(log_attributes"));
        assertTrue(sql.contains("lower('Timeout')"));
        assertTrue(sql.contains("json_path_match(log_attributes"));
        String typed = GreptimeStructuredLogPredicate.compile(new Term(
                new Field(Domain.ATTRIBUTE, "title"), Operator.TERM, "Timeout"));
        assertTrue(typed.contains("matches_term(json_get_string(log_attributes"));
        assertFalse(typed.contains("lower("));
    }

    @Test
    void fullTextSearchScansCompleteScalarValuesAndScrubsOnlyReservedResourceKeys() {
        String plain = GreptimeStructuredLogPredicate.compile(
                new Term(new Field(Domain.FULL_TEXT, "all"), Operator.FULL_TEXT_TERM, "needle"));
        assertTrue(plain.contains("matches_term(lower(body), lower('needle'))"));
        assertFalse(plain.contains("json_to_string(body)"));
        assertTrue(plain.contains("regexp_like(regexp_replace(json_to_string(log_attributes)"));
        assertTrue(plain.contains("regexp_like(regexp_replace(json_to_string(resource_attributes)"));
        assertTrue(plain.contains("hertzbeat[._])?workspace[._]id"));
        assertTrue(plain.contains("[^A-Za-z0-9]"));
        assertTrue(plain.contains("COALESCE((matches_term(lower(body)"));
        assertFalse(plain.contains("matches_term(json_to_string"));

        String wildcard = GreptimeStructuredLogPredicate.compile(
                new Term(new Field(Domain.FULL_TEXT, "all"), Operator.FULL_TEXT_GLOB, "*needle*"));
        assertTrue(wildcard.contains("(?:\\\\.|[^\"\\\\])*"));
        assertTrue(wildcard.contains("regexp_like(lower(body)"));
        assertFalse(wildcard.contains("json_to_string(body)"));
        assertFalse(wildcard.contains("[^A-Za-z0-9]"));

        String emptyPhrase = GreptimeStructuredLogPredicate.compile(
                new Term(new Field(Domain.FULL_TEXT, "all"), Operator.FULL_TEXT_TERM, ""));
        assertTrue(emptyPhrase.contains("body = ''"));
        assertTrue(emptyPhrase.contains("\"\""));
    }

    @Test
    void existenceKeepsNullAndContainerKeysAndStatusUsesSeverityCategory() {
        assertTrue(GreptimeStructuredLogPredicate.compile(new Term(new Field(Domain.ATTRIBUTE, "n"),
                Operator.EXISTS, "")).contains("json_path_exists"));
        String status = GreptimeStructuredLogPredicate.compile(new Term(new Field(Domain.BUILTIN, "status"),
                Operator.EQUALS, "ERROR"));
        assertTrue(status.contains("severity_number BETWEEN 17 AND 20"));
        assertFalse(status.contains("severity_text"));
    }

    @Test
    void builtinIdentityUsesUntrimmedScalarAliases() {
        for (String key : List.of("service", "namespace", "env")) {
            String sql = GreptimeStructuredLogPredicate.compile(new Term(new Field(Domain.BUILTIN, key),
                    Operator.EQUALS, ""));
            assertTrue(sql.contains("COALESCE(json_get_string(resource_attributes"));
            assertFalse(sql.contains("NULLIF"));
            assertFalse(sql.contains("TRIM"));
        }
    }

    @Test
    void returnedServiceAliasCanBeSearchedWhenOnlyTheNativeColumnSuppliesIt() {
        var field = new Field(Domain.RESOURCE, "service_name");
        String equality = GreptimeStructuredLogPredicate.compile(new Term(field, Operator.EQUALS, "HertzBeat"));
        assertTrue(equality.contains("service_name"));
        assertTrue(equality.contains("COALESCE(json_get_string(resource_attributes"));
        String exists = GreptimeStructuredLogPredicate.compile(new Term(field, Operator.EXISTS, ""));
        assertTrue(exists.contains("service_name IS NOT NULL"));
    }

    @Test
    void nativeNumberEqualityIsTypedAndGlobExcludesNumbers() {
        var field = new Field(Domain.ATTRIBUTE, "n");
        String equality = GreptimeStructuredLogPredicate.compile(new Term(field, Operator.EQUALS, "1e-8"));
        assertTrue(equality.contains("TRY_CAST("));
        assertTrue(equality.contains("json_path_match"));
        String glob = GreptimeStructuredLogPredicate.compile(new Term(field, Operator.GLOB, "*"));
        assertTrue(glob.contains("json_path_match"));
        assertTrue(glob.contains(" AND regexp_like"));
    }

    @Test
    void refusesUnknownFieldAndUnsafeNumericLiteral() {
        assertThrows(IllegalArgumentException.class, () -> GreptimeStructuredLogPredicate.compile(
                new Term(new Field(Domain.BUILTIN, "body OR true"), Operator.EQUALS, "x")));
        assertThrows(IllegalArgumentException.class, () -> GreptimeStructuredLogPredicate.compile(
                new Term(new Field(Domain.ATTRIBUTE, "n"), Operator.GT, "1 OR true")));
    }
}
