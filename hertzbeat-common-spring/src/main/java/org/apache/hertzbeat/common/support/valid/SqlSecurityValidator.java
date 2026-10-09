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
import net.sf.jsqlparser.statement.Statements;
import net.sf.jsqlparser.statement.delete.Delete;
import net.sf.jsqlparser.statement.insert.Insert;
import net.sf.jsqlparser.statement.merge.Merge;
import net.sf.jsqlparser.statement.select.LateralSubSelect;
import net.sf.jsqlparser.statement.select.ParenthesedSelect;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.Select;
import net.sf.jsqlparser.statement.select.SetOperationList;
import net.sf.jsqlparser.statement.select.WithItem;
import net.sf.jsqlparser.statement.update.Update;
import net.sf.jsqlparser.util.TablesNamesFinder;
import org.springframework.util.CollectionUtils;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

/**
 * SQL Security Validator using JSqlParser 5.1+.
 *
 * <p>Two modes, see {@link #SqlSecurityValidator(Collection)} and {@link #selectOnly()}:
 * <ul>
 *   <li>whitelisting: only SELECT, every referenced table must be whitelisted, and
 *   subqueries, UNION, CTE and LATERAL are blocked because they are the ways a statement
 *   can reach a table the whitelist never mentions.</li>
 *   <li>read only: only SELECT, any table, nested reads kept.</li>
 * </ul>
 *
 * <p>Both modes reject a string that carries more than one statement, and neither lets a
 * write through at any depth of the statement.
 */
@Slf4j
public class SqlSecurityValidator {

    private static final String SELECT_KEYWORD = "SELECT";

    private static final String WITH_KEYWORD = "WITH";

    /**
     * Words that no read contains, matched as whole words outside literals and comments.
     *
     * <p>This is the check that holds when the parser cannot read the dialect and there is no
     * tree to walk, so it has to catch a write wherever it sits, including nested in a cte or
     * a subquery. It is deliberately coarse; the tree walk is the precise one.
     *
     * <p>Statements that can only stand alone, {@code TRUNCATE} and {@code CALL} among them,
     * are absent: the leading keyword already rejects those, and several of them double as
     * ordinary functions, {@code TRUNCATE(value, 2)} and {@code REPLACE(msg, 'a', 'b')} being
     * the ones a metric query really does use. An identifier that collides with a word listed
     * here can still be quoted, which the scan skips over.
     */
    private static final Set<String> WRITE_KEYWORDS = Set.of(
            "DELETE", "INSERT", "UPDATE", "MERGE", "INTO", "DROP", "ALTER",
            "CREATE", "GRANT", "REVOKE", "COPY", "RENAME", "ATTACH", "DETACH");

    private static final String DURATION = "[0-9]+(?:ms|[smhdwy])(?:\\s*[0-9]+(?:ms|[smhdwy]))*";

    private static final Pattern GREPTIME_RANGE_CLAUSE = Pattern.compile(
            "(?i)\\bRANGE\\s*'\\s*" + DURATION + "\\s*'");

    private static final Pattern GREPTIME_ALIGN_CLAUSE = Pattern.compile(
            "(?i)\\bALIGN\\s*'\\s*" + DURATION + "\\s*'");

    private static final Pattern GREPTIME_FILL_CLAUSE = Pattern.compile(
            "(?i)\\bFILL\\s+(?:LINEAR|PREV|NEXT|NULL)\\b");

    private final Set<String> allowedTables;

    private final ValidationPolicy validationPolicy;

    public SqlSecurityValidator(Collection<String> allowedTables) {
        if (CollectionUtils.isEmpty(allowedTables)) {
            this.allowedTables = new HashSet<>();
        } else {
            this.allowedTables = allowedTables.stream()
                    .map(this::normalizeIdentifier)
                    .collect(Collectors.toSet());
        }
        this.validationPolicy = ValidationPolicy.WHITELISTED_SELECT;
    }

    private SqlSecurityValidator() {
        this.allowedTables = new HashSet<>();
        this.validationPolicy = ValidationPolicy.READ_ONLY;
    }

    /**
     * A validator whose whole policy is "this statement may only read".
     *
     * <p>Use it where there is no table list to validate against: metric tables are created
     * on demand, one per metric, so the whitelisting constructor would reject every
     * legitimate metric query.
     *
     * <p>It deliberately keeps subqueries, unions and ctes, unlike the whitelisting mode.
     * Those structures are blocked there because they are the ways a statement can reach a
     * table the whitelist never mentions; with every table already readable they buy no
     * protection, while alert expressions do use subqueries and nested aggregation.
     * @return A validator that accepts only statements proven to be read-only
     */
    public static SqlSecurityValidator selectOnly() {
        return new SqlSecurityValidator();
    }

    public void validate(String sql) throws SqlSecurityException {
        if (sql == null || sql.trim().isEmpty()) {
            throw new SqlSecurityException("SQL statement cannot be empty");
        }
        switch (validationPolicy) {
            case WHITELISTED_SELECT -> validateAgainstWhitelist(sql);
            case READ_ONLY -> validateReadOnly(sql);
            // not dead: a policy added later that nobody wired up here must refuse the
            // statement rather than fall through this switch having validated nothing
            default -> throw new SqlSecurityException("Unknown SQL validation policy.");
        }
    }

    /**
     * Read only mode, which runs against a time series database whose sql dialect JSqlParser
     * does not fully cover: GreptimeDB range queries such as
     * {@code SELECT avg(v) RANGE '10s' FROM cpu ALIGN '5s'} are rejected by the parser
     * although they are ordinary reads.
     *
     * <p>So the first properties this mode has to guarantee are established without the parser:
     * statements are counted by scanning outside string literals and comments, the leading
     * keyword decides whether the statement reads, and no word that only a write contains may
     * appear anywhere. All three are dialect independent, and the last one is what covers a
     * write nested where the scan has no structure to reason about, as in
     * {@code WITH x AS (DELETE FROM cpu RETURNING *) SELECT * FROM x}.
     *
     * <p>The parser must still prove the complete statement tree and enumerate every table.
     * For the Greptime clauses JSqlParser does not understand, a validation-only copy has the
     * bounded {@code RANGE}, {@code ALIGN}, and {@code FILL} clauses removed before parsing.
     * Any other unsupported syntax fails closed instead of relying on a keyword denylist as
     * the sole proof of read-only behavior.
     * @param sql Statement to validate
     * @throws SqlSecurityException If the statement writes, or carries more than one statement
     */
    private void validateReadOnly(String sql) throws SqlSecurityException {
        final StatementShape shape = scan(sql);
        if (shape.statementCount() != 1) {
            throw new SqlSecurityException("Only a single statement is allowed.");
        }
        if (shape.writeKeyword() != null) {
            throw new SqlSecurityException("'" + shape.writeKeyword() + "' is not allowed, only reads are.");
        }
        if (!SELECT_KEYWORD.equals(shape.leadingKeyword()) && !WITH_KEYWORD.equals(shape.leadingKeyword())) {
            throw new SqlSecurityException("Only SELECT statements are allowed.");
        }
        final Statement statement = parseReadOnlyStatement(sql);

        if (!(statement instanceof Select)) {
            throw new SqlSecurityException("Only SELECT statements are allowed.");
        }
        final List<String> tables = assertNothingWrites(statement);
        if (tables.stream().map(this::normalizeIdentifier).anyMatch(table -> table.contains("."))) {
            throw new SqlSecurityException("Schema-qualified tables are not allowed.");
        }
    }

    private Statement parseReadOnlyStatement(String sql) throws SqlSecurityException {
        try {
            return parseSingleStatement(sql);
        } catch (JSQLParserException originalFailure) {
            String parserCompatibleSql = GREPTIME_RANGE_CLAUSE.matcher(sql).replaceAll("");
            parserCompatibleSql = GREPTIME_ALIGN_CLAUSE.matcher(parserCompatibleSql).replaceAll("");
            parserCompatibleSql = GREPTIME_FILL_CLAUSE.matcher(parserCompatibleSql).replaceAll("");
            if (parserCompatibleSql.equals(sql)) {
                throw new SqlSecurityException("Invalid SQL syntax: " + originalFailure.getMessage(), originalFailure);
            }
            try {
                return parseSingleStatement(parserCompatibleSql);
            } catch (JSQLParserException normalizedFailure) {
                log.debug("Failed to parse SQL after removing Greptime range clauses: {}", sql, normalizedFailure);
                throw new SqlSecurityException(
                        "SQL structure could not be verified as a read: " + normalizedFailure.getMessage(),
                        normalizedFailure);
            }
        }
    }

    /**
     * Walks the whole statement rather than its outermost node, because a write hides at any
     * depth: {@code SELECT * INTO backup FROM cpu UNION SELECT * FROM cpu} puts the write in a
     * branch of a set operation, and {@code SELECT * FROM (SELECT * INTO backup FROM cpu) t}
     * puts it in a subquery, so an outermost node that is a plain select proves nothing.
     *
     * <p>Any other failure of the walk is a rejection too. A data modifying cte makes
     * JSqlParser's own finder cast a {@code ParenthesedDelete} to a {@code ParenthesedSelect},
     * and a walk that ended in an exception established nothing about the statement.
     * @param statement Parsed statement to walk
     * @throws SqlSecurityException If any part of the statement writes, or could not be walked
     */
    private List<String> assertNothingWrites(Statement statement) throws SqlSecurityException {
        try {
            return new ReadOnlyStatementFinder().getTableList(statement);
        } catch (SecurityViolationException e) {
            throw new SqlSecurityException(e.getMessage());
        } catch (RuntimeException e) {
            log.debug("Failed to walk SQL, so nothing about it is established: {}", statement, e);
            throw new SqlSecurityException("SQL structure could not be verified as a read.");
        }
    }

    private void validateAgainstWhitelist(String sql) throws SqlSecurityException {
        final Statement statement;
        try {
            statement = parseSingleStatement(sql);
        } catch (JSQLParserException e) {
            log.debug("Failed to parse SQL: {}", sql, e);
            throw new SqlSecurityException("Invalid SQL syntax: " + e.getMessage(), e);
        }

        if (!(statement instanceof Select select)) {
            throw new SqlSecurityException("Only SELECT statements are allowed.");
        }

        // The whitelist is about which tables a statement may touch, so on its own it lets
        // "select * into backup from hertzbeat_logs" through: every table it names is allowed
        assertNothingWrites(statement);

        // Check for CTE at top level
        if (select.getWithItemsList() != null && !select.getWithItemsList().isEmpty()) {
            throw new SqlSecurityException("CTE (WITH clause) is not allowed");
        }

        // Use custom TablesNamesFinder that throws on dangerous structures
        final SecurityTablesNamesFinder finder = new SecurityTablesNamesFinder();
        final List<String> tables;
        try {
            tables = finder.getTableList(statement);
        } catch (SecurityViolationException e) {
            throw new SqlSecurityException(e.getMessage());
        }

        validateTables(tables);
    }

    /**
     * @param sql Statement to parse
     * @return The only statement the string carries
     * @throws JSQLParserException If the string does not parse
     * @throws SqlSecurityException If the string carries more than one statement
     */
    private Statement parseSingleStatement(String sql) throws JSQLParserException, SqlSecurityException {
        final Statements statements = CCJSqlParserUtil.parseStatements(sql);
        // ParseStatements rather than parse: parse() returns only the first statement.
        // Otherwise, "select 1; drop table x" would validate as a plain select.
        // The caller would still hand the whole string to the database.
        if (statements.getStatements().size() != 1) {
            throw new SqlSecurityException("Only a single statement is allowed.");
        }
        return statements.getStatements().get(0);
    }

    /**
     * What a statement string looks like from outside any sql dialect.
     * @param statementCount Statements the string carries, a trailing semicolon not counting as one
     * @param leadingKeyword First word of the first statement, upper cased, empty when it does not start with a word
     * @param writeKeyword First word from {@link #WRITE_KEYWORDS} found anywhere, null when there is none
     */
    private record StatementShape(int statementCount, String leadingKeyword, String writeKeyword) {
    }

    /**
     * Counts the statements a string carries and reads the word it opens with, skipping over
     * string literals, quoted identifiers and comments so that a semicolon inside them is not
     * mistaken for a statement separator.
     *
     * <p>A backslash is not treated as an escape, because assuming it escapes the closing
     * quote in a dialect where it does not would let {@code 'a\'; DROP TABLE t} hide a second
     * statement inside what this scan thinks is one literal. Not assuming it costs at worst a
     * rejection of a statement that uses backslash escapes, which errs the safe way.
     * @param sql Statement string to scan
     * @return The shape of the string
     * @throws SqlSecurityException If a literal or a block comment is left open
     */
    private StatementShape scan(String sql) throws SqlSecurityException {
        int statementCount = 0;
        boolean statementHasContent = false;
        String leadingKeyword = "";
        String writeKeyword = null;
        int index = 0;
        while (index < sql.length()) {
            final char current = sql.charAt(index);
            if (current == '-' && index + 1 < sql.length() && sql.charAt(index + 1) == '-') {
                final int lineEnd = sql.indexOf('\n', index);
                index = lineEnd < 0 ? sql.length() : lineEnd + 1;
            } else if (current == '/' && index + 1 < sql.length() && sql.charAt(index + 1) == '*') {
                final int commentEnd = sql.indexOf("*/", index + 2);
                if (commentEnd < 0) {
                    throw new SqlSecurityException("Unterminated block comment.");
                }
                index = commentEnd + 2;
            } else if (current == '$') {
                rejectDollarQuote(sql, index);
                statementHasContent = true;
                index++;
            } else if (current == '\'' || current == '"' || current == '`') {
                index = skipQuoted(sql, index, current);
                statementHasContent = true;
            } else if (current == ';') {
                if (statementHasContent) {
                    statementCount++;
                }
                statementHasContent = false;
                index++;
            } else if (Character.isLetter(current) || current == '_') {
                // Read the whole word and step past it.
                // Match a write keyword only on its own, never inside an identifier like delete_count.
                final int wordEnd = wordEnd(sql, index);
                final String word = sql.substring(index, wordEnd).toUpperCase(Locale.ROOT);
                if (statementCount == 0 && !statementHasContent) {
                    leadingKeyword = word;
                }
                if (writeKeyword == null && WRITE_KEYWORDS.contains(word)) {
                    writeKeyword = word;
                }
                statementHasContent = true;
                index = wordEnd;
            } else {
                if (!Character.isWhitespace(current)) {
                    statementHasContent = true;
                }
                index++;
            }
        }
        if (statementHasContent) {
            statementCount++;
        }
        return new StatementShape(statementCount, leadingKeyword, writeKeyword);
    }

    /**
     * @param sql Statement string being scanned
     * @param start Index of the opening quote
     * @param quote Quote character to close on, a doubled one being an escaped quote rather than the close
     * @return Index just past the closing quote
     * @throws SqlSecurityException If the quote is never closed
     */
    private int skipQuoted(String sql, int start, char quote) throws SqlSecurityException {
        int index = start + 1;
        while (index < sql.length()) {
            if (sql.charAt(index) == quote) {
                if (index + 1 < sql.length() && sql.charAt(index + 1) == quote) {
                    index += 2;
                    continue;
                }
                return index + 1;
            }
            index++;
        }
        throw new SqlSecurityException("Unterminated quoted literal.");
    }

    /**
     * Rejects a PostgreSQL dollar-quoted literal, {@code $$...$$} or {@code $tag$...$tag$}.
     *
     * <p>Comment markers and semicolons inside such a literal are data, so a scan that reads
     * them as syntax loses the rest of the input: {@code SELECT $$--$$; DROP TABLE cpu} looks
     * like one statement once the {@code --} is taken for a comment.
     *
     * <p>Rejecting rather than skipping, because skipping would be the same assumption in
     * reverse. A dialect without dollar quoting means the semicolon inside one really does
     * separate statements, and a scan that skipped the literal would be the thing hiding
     * them. Rejecting needs no assumption either way: a dialect that has dollar quoting is
     * refused, and one that does not was going to fail on the syntax regardless. No read of a
     * metric table spells anything this way.
     * @param sql Statement string being scanned
     * @param start Index of the dollar sign
     * @throws SqlSecurityException If a dollar-quoted literal opens here
     */
    private void rejectDollarQuote(String sql, int start) throws SqlSecurityException {
        int tagEnd = start + 1;
        if (tagEnd >= sql.length()) {
            return;
        }
        final char firstTagCharacter = sql.charAt(tagEnd);
        if (firstTagCharacter != '$'
                && !Character.isLetter(firstTagCharacter)
                && firstTagCharacter != '_') {
            // a positional parameter such as $1, or a dollar sign that is just a character
            return;
        }
        while (tagEnd < sql.length()
                && (Character.isLetterOrDigit(sql.charAt(tagEnd)) || sql.charAt(tagEnd) == '_')) {
            tagEnd++;
        }
        if (tagEnd >= sql.length() || sql.charAt(tagEnd) != '$') {
            return;
        }
        throw new SqlSecurityException("Dollar-quoted literals are not allowed.");
    }

    /**
     * @param sql Statement string being scanned
     * @param start Index of the first character of a word
     * @return Index just past the word, digits and underscores counting as part of it so that
     *     {@code delete_count} is one word rather than a {@code delete} followed by a remainder.
     *     A dollar sign ends the word, so that a literal opening right after an identifier is
     *     still seen by {@link #rejectDollarQuote}
     */
    private int wordEnd(String sql, int start) {
        int index = start;
        while (index < sql.length()
                && (Character.isLetterOrDigit(sql.charAt(index)) || sql.charAt(index) == '_')) {
            index++;
        }
        return index;
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

    private enum ValidationPolicy {
        WHITELISTED_SELECT,
        READ_ONLY
    }

    /**
     * Walks a statement and throws as soon as it finds a part of it that writes, at any depth.
     */
    private static class ReadOnlyStatementFinder extends TablesNamesFinder<Void> {

        @Override
        public Void visit(PlainSelect plainSelect, Object context) {
            // SELECT ... INTO writes a new table in the dialects that support it, so it is not a read.
            if (!CollectionUtils.isEmpty(plainSelect.getIntoTables())) {
                throw new SecurityViolationException("SELECT ... INTO is not allowed.");
            }
            return super.visit(plainSelect, context);
        }

        @Override
        public Void visit(Delete delete, Object context) {
            throw new SecurityViolationException("DELETE is not allowed, only reads are.");
        }

        @Override
        public Void visit(Insert insert, Object context) {
            throw new SecurityViolationException("INSERT is not allowed, only reads are.");
        }

        @Override
        public Void visit(Update update, Object context) {
            throw new SecurityViolationException("UPDATE is not allowed, only reads are.");
        }

        @Override
        public Void visit(Merge merge, Object context) {
            throw new SecurityViolationException("MERGE is not allowed, only reads are.");
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
