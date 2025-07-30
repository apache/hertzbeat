package org.apache.hertzbeat.alert.expr.sql;

import org.antlr.v4.runtime.CommonTokenStream;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;

import java.util.List;
import java.util.Map;

/**
 * Sql expression evaluation visitor.
 */
public class SqlExpressionEvalVisitor extends SqlExpressionBaseVisitor<List<Map<String, Object>>> {

    private final QueryExecutor executor;
    private final CommonTokenStream tokens;

    public SqlExpressionEvalVisitor(QueryExecutor executor, CommonTokenStream tokens) {
        this.executor = executor;
        this.tokens = tokens;
    }

    @Override
    public List<Map<String, Object>> visitExpression(SqlExpressionParser.ExpressionContext ctx) {
        return super.visit(ctx.sqlExpr());
    }

    @Override
    public List<Map<String, Object>> visitSelectSqlExpr(SqlExpressionParser.SelectSqlExprContext ctx) {
        String rawSql = tokens.getText(ctx.selectSql());
        return executor.execute(rawSql);
    }

    @Override
    public List<Map<String, Object>> visitSelectSqlCallExpr(SqlExpressionParser.SelectSqlCallExprContext ctx) {
        return callSql(tokens.getText(ctx.string()));
    }

    private List<Map<String, Object>> callSql(String text) {
        String script = text.substring(1, text.length() - 1);
        return executor.execute(script);
    }
}
