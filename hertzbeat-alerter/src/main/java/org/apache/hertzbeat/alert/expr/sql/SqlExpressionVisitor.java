package org.apache.hertzbeat.alert.expr.sql;

import org.antlr.v4.runtime.tree.ParseTreeVisitor;

/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by {@link SqlExpressionParser}.
 *
 * @param <T> The return type of the visit operation. Use {@link Void} for
 * operations with no return type.
 */
public interface SqlExpressionVisitor<T> extends ParseTreeVisitor<T> {

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#expression}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitExpression(SqlExpressionParser.ExpressionContext ctx);

    /**
     * Visit a parse tree produced by the {@code SelectSqlExpr}
     * labeled alternative in {@link SqlExpressionParser#sqlExpr}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectSqlExpr(SqlExpressionParser.SelectSqlExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code SelectSqlCallExpr}
     * labeled alternative in {@link SqlExpressionParser#sqlExpr}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectSqlCallExpr(SqlExpressionParser.SelectSqlCallExprContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#selectSql}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectSql(SqlExpressionParser.SelectSqlContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#selectFieldList}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectFieldList(SqlExpressionParser.SelectFieldListContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#selectField}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectField(SqlExpressionParser.SelectFieldContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#relList}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitRelList(SqlExpressionParser.RelListContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#relation}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitRelation(SqlExpressionParser.RelationContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#conditionList}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitConditionList(SqlExpressionParser.ConditionListContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#compOp}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitCompOp(SqlExpressionParser.CompOpContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#condition}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitCondition(SqlExpressionParser.ConditionContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#conditionUnit}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitConditionUnit(SqlExpressionParser.ConditionUnitContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#functionCall}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitFunctionCall(SqlExpressionParser.FunctionCallContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#functionName}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitFunctionName(SqlExpressionParser.FunctionNameContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#parameterList}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitParameterList(SqlExpressionParser.ParameterListContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#parameter}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitParameter(SqlExpressionParser.ParameterContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#groupByList}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitGroupByList(SqlExpressionParser.GroupByListContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#orderByList}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitOrderByList(SqlExpressionParser.OrderByListContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#orderByField}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitOrderByField(SqlExpressionParser.OrderByFieldContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#limitClause}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLimitClause(SqlExpressionParser.LimitClauseContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#number}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitNumber(SqlExpressionParser.NumberContext ctx);

    /**
     * Visit a parse tree produced by {@link SqlExpressionParser#string}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitString(SqlExpressionParser.StringContext ctx);
}