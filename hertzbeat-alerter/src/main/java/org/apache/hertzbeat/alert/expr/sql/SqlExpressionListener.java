package org.apache.hertzbeat.alert.expr.sql;

import org.antlr.v4.runtime.tree.ParseTreeListener;

/**
 * This interface defines a complete listener for a parse tree produced by
 * {@link SqlExpressionParser}.
 */
public interface SqlExpressionListener extends ParseTreeListener {

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#expression}.
     * @param ctx the parse tree
     */
    void enterExpression(SqlExpressionParser.ExpressionContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#expression}.
     * @param ctx the parse tree
     */
    void exitExpression(SqlExpressionParser.ExpressionContext ctx);

    /**
     * Enter a parse tree produced by the {@code SelectSqlExpr}
     * labeled alternative in {@link SqlExpressionParser#sqlExpr}.
     * @param ctx the parse tree
     */
    void enterSelectSqlExpr(SqlExpressionParser.SelectSqlExprContext ctx);

    /**
     * Exit a parse tree produced by the {@code SelectSqlExpr}
     * labeled alternative in {@link SqlExpressionParser#sqlExpr}.
     * @param ctx the parse tree
     */
    void exitSelectSqlExpr(SqlExpressionParser.SelectSqlExprContext ctx);

    /**
     * Enter a parse tree produced by the {@code SelectSqlCallExpr}
     * labeled alternative in {@link SqlExpressionParser#sqlExpr}.
     * @param ctx the parse tree
     */
    void enterSelectSqlCallExpr(SqlExpressionParser.SelectSqlCallExprContext ctx);

    /**
     * Exit a parse tree produced by the {@code SelectSqlCallExpr}
     * labeled alternative in {@link SqlExpressionParser#sqlExpr}.
     * @param ctx the parse tree
     */
    void exitSelectSqlCallExpr(SqlExpressionParser.SelectSqlCallExprContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#selectSql}.
     * @param ctx the parse tree
     */
    void enterSelectSql(SqlExpressionParser.SelectSqlContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#selectSql}.
     * @param ctx the parse tree
     */
    void exitSelectSql(SqlExpressionParser.SelectSqlContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#selectFieldList}.
     * @param ctx the parse tree
     */
    void enterSelectFieldList(SqlExpressionParser.SelectFieldListContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#selectFieldList}.
     * @param ctx the parse tree
     */
    void exitSelectFieldList(SqlExpressionParser.SelectFieldListContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#selectField}.
     * @param ctx the parse tree
     */
    void enterSelectField(SqlExpressionParser.SelectFieldContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#selectField}.
     * @param ctx the parse tree
     */
    void exitSelectField(SqlExpressionParser.SelectFieldContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#relList}.
     * @param ctx the parse tree
     */
    void enterRelList(SqlExpressionParser.RelListContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#relList}.
     * @param ctx the parse tree
     */
    void exitRelList(SqlExpressionParser.RelListContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#relation}.
     * @param ctx the parse tree
     */
    void enterRelation(SqlExpressionParser.RelationContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#relation}.
     * @param ctx the parse tree
     */
    void exitRelation(SqlExpressionParser.RelationContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#conditionList}.
     * @param ctx the parse tree
     */
    void enterConditionList(SqlExpressionParser.ConditionListContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#conditionList}.
     * @param ctx the parse tree
     */
    void exitConditionList(SqlExpressionParser.ConditionListContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#compOp}.
     * @param ctx the parse tree
     */
    void enterCompOp(SqlExpressionParser.CompOpContext ctx);
   
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#compOp}.
     * @param ctx the parse tree
     */
    void exitCompOp(SqlExpressionParser.CompOpContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#condition}.
     * @param ctx the parse tree
     */
    void enterCondition(SqlExpressionParser.ConditionContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#condition}.
     * @param ctx the parse tree
     */
    void exitCondition(SqlExpressionParser.ConditionContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#conditionUnit}.
     * @param ctx the parse tree
     */
    void enterConditionUnit(SqlExpressionParser.ConditionUnitContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#conditionUnit}.
     * @param ctx the parse tree
     */
    void exitConditionUnit(SqlExpressionParser.ConditionUnitContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#functionCall}.
     * @param ctx the parse tree
     */
    void enterFunctionCall(SqlExpressionParser.FunctionCallContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#functionCall}.
     * @param ctx the parse tree
     */
    void exitFunctionCall(SqlExpressionParser.FunctionCallContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#functionName}.
     * @param ctx the parse tree
     */
    void enterFunctionName(SqlExpressionParser.FunctionNameContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#functionName}.
     * @param ctx the parse tree
     */
    void exitFunctionName(SqlExpressionParser.FunctionNameContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#parameterList}.
     * @param ctx the parse tree
     */
    void enterParameterList(SqlExpressionParser.ParameterListContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#parameterList}.
     * @param ctx the parse tree
     */
    void exitParameterList(SqlExpressionParser.ParameterListContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#parameter}.
     * @param ctx the parse tree
     */
    void enterParameter(SqlExpressionParser.ParameterContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#parameter}.
     * @param ctx the parse tree
     */
    void exitParameter(SqlExpressionParser.ParameterContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#groupByList}.
     * @param ctx the parse tree
     */
    void enterGroupByList(SqlExpressionParser.GroupByListContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#groupByList}.
     * @param ctx the parse tree
     */
    void exitGroupByList(SqlExpressionParser.GroupByListContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#orderByList}.
     * @param ctx the parse tree
     */
    void enterOrderByList(SqlExpressionParser.OrderByListContext ctx);
    
    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#orderByList}.
     * @param ctx the parse tree
     */
    void exitOrderByList(SqlExpressionParser.OrderByListContext ctx);
    
    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#orderByField}.
     * @param ctx the parse tree
     */
    void enterOrderByField(SqlExpressionParser.OrderByFieldContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#orderByField}.
     * @param ctx the parse tree
     */
    void exitOrderByField(SqlExpressionParser.OrderByFieldContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#limitClause}.
     * @param ctx the parse tree
     */
    void enterLimitClause(SqlExpressionParser.LimitClauseContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#limitClause}.
     * @param ctx the parse tree
     */
    void exitLimitClause(SqlExpressionParser.LimitClauseContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#number}.
     * @param ctx the parse tree
     */
    void enterNumber(SqlExpressionParser.NumberContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#number}.
     * @param ctx the parse tree
     */
    void exitNumber(SqlExpressionParser.NumberContext ctx);

    /**
     * Enter a parse tree produced by {@link SqlExpressionParser#string}.
     * @param ctx the parse tree
     */
    void enterString(SqlExpressionParser.StringContext ctx);

    /**
     * Exit a parse tree produced by {@link SqlExpressionParser#string}.
     * @param ctx the parse tree
     */
    void exitString(SqlExpressionParser.StringContext ctx);
}