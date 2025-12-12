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

import lombok.extern.slf4j.Slf4j;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.LateralSubSelect;
import net.sf.jsqlparser.statement.select.ParenthesedSelect;
import net.sf.jsqlparser.statement.select.Select;
import net.sf.jsqlparser.statement.select.SetOperationList;
import net.sf.jsqlparser.statement.select.WithItem;
import net.sf.jsqlparser.util.TablesNamesFinder;
import org.springframework.util.CollectionUtils;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * SQL Security Validator using JSqlParser 5.1+.
 * Security Policy:
 * 1. Only SELECT statements are allowed.
 * 2. All referenced tables must be in the whitelist.
 * 3. Subqueries, UNION, CTE, LATERAL are blocked.
 */
@Slf4j
public class SqlSecurityValidator {

    private final Set<String> allowedTables;

    public SqlSecurityValidator(Collection<String> allowedTables) {
        if (CollectionUtils.isEmpty(allowedTables)) {
            this.allowedTables = new HashSet<>();
        } else {
            this.allowedTables = allowedTables.stream()
                    .map(this::normalizeIdentifier)
                    .collect(Collectors.toSet());
        }
    }

    public void validate(String sql) throws SqlSecurityException {
        if (sql == null || sql.trim().isEmpty()) {
            throw new SqlSecurityException("SQL statement cannot be empty");
        }

        Statement statement;
        try {
            statement = CCJSqlParserUtil.parse(sql);
        } catch (JSQLParserException e) {
            log.warn("Failed to parse SQL: {}", sql, e);
            throw new SqlSecurityException("Invalid SQL syntax: " + e.getMessage(), e);
        }

        if (!(statement instanceof Select select)) {
            throw new SqlSecurityException("Only SELECT statements are allowed.");
        }

        // Check for CTE at top level
        if (select.getWithItemsList() != null && !select.getWithItemsList().isEmpty()) {
            throw new SqlSecurityException("CTE (WITH clause) is not allowed");
        }

        // Use custom TablesNamesFinder that throws on dangerous structures
        SecurityTablesNamesFinder finder = new SecurityTablesNamesFinder();
        List<String> tables;
        try {
            tables = finder.getTableList(statement);
        } catch (SecurityViolationException e) {
            throw new SqlSecurityException(e.getMessage());
        }

        validateTables(tables);
    }

    private void validateTables(List<String> tables) throws SqlSecurityException {
        if (CollectionUtils.isEmpty(tables)) {
            return;
        }
        if (allowedTables.isEmpty()) {
            throw new SqlSecurityException("No access allowed: whitelist is empty.");
        }

        for (String table : tables) {
            String normalizedTable = normalizeIdentifier(table);
            if (!allowedTables.contains(normalizedTable)) {
                throw new SqlSecurityException("Access to table '" + table + "' is not allowed. "
                        + "Allowed tables: " + allowedTables);
            }
        }
    }

    private String normalizeIdentifier(String identifier) {
        if (identifier == null) {
            return "";
        }
        return identifier.replace("\"", "").replace("`", "").replace("'", "").toLowerCase();
    }

    private static class SecurityViolationException extends RuntimeException {
        SecurityViolationException(String message) {
            super(message);
        }
    }

    /**
     * Custom TablesNamesFinder that throws exceptions on dangerous SQL structures.
     * Extends TablesNamesFinder with proper generic type to avoid raw type warnings.
     */
    private static class SecurityTablesNamesFinder extends TablesNamesFinder<Void> {

        @Override
        public Void visit(ParenthesedSelect parenthesedSelect, Object context) {
            throw new SecurityViolationException("Subqueries are not allowed");
        }

        @Override
        public Void visit(SetOperationList setOpList, Object context) {
            throw new SecurityViolationException("UNION and set operations are not allowed");
        }

        @Override
        public Void visit(LateralSubSelect lateralSubSelect, Object context) {
            throw new SecurityViolationException("LATERAL subqueries are not allowed");
        }

        @Override
        public Void visit(WithItem withItem, Object context) {
            throw new SecurityViolationException("CTE (WITH clause) is not allowed");
        }
    }
}
