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

// Generated from AlertExpression.g4 by ANTLR 4.13.2

package org.apache.hertzbeat.alert.expr;

import org.antlr.v4.runtime.tree.ParseTreeVisitor;

/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by {@link AlertExpressionParser}.
 *
 * @param <T> The return type of the visit operation. Use {@link Void} for
 *            operations with no return type.
 */
public interface AlertExpressionVisitor<T> extends ParseTreeVisitor<T> {

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#expression}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitExpression(AlertExpressionParser.ExpressionContext ctx);

    /**
     * Visit a parse tree produced by the {@code AndExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitAndExpr(AlertExpressionParser.AndExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code ComparisonExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitComparisonExpr(AlertExpressionParser.ComparisonExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code UnlessExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitUnlessExpr(AlertExpressionParser.UnlessExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code SqlExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSqlExpr(AlertExpressionParser.SqlExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code SqlCallExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSqlCallExpr(AlertExpressionParser.SqlCallExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code LiteralExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLiteralExpr(AlertExpressionParser.LiteralExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code ParenExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitParenExpr(AlertExpressionParser.ParenExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code PromqlCallExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitPromqlCallExpr(AlertExpressionParser.PromqlCallExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code PromqlExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitPromqlExpr(AlertExpressionParser.PromqlExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code OrExpr}
     * labeled alternative in {@link AlertExpressionParser#expr}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitOrExpr(AlertExpressionParser.OrExprContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#functionCall}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitFunctionCall(AlertExpressionParser.FunctionCallContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#parameterList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitParameterList(AlertExpressionParser.ParameterListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#parameter}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitParameter(AlertExpressionParser.ParameterContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#number}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitNumber(AlertExpressionParser.NumberContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#string}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitString(AlertExpressionParser.StringContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#duration}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitDuration(AlertExpressionParser.DurationContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#functionName}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitFunctionName(AlertExpressionParser.FunctionNameContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#selectSql}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectSql(AlertExpressionParser.SelectSqlContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#selectFieldList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectFieldList(AlertExpressionParser.SelectFieldListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#selectField}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitSelectField(AlertExpressionParser.SelectFieldContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#groupByList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitGroupByList(AlertExpressionParser.GroupByListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#orderByList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitOrderByList(AlertExpressionParser.OrderByListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#orderByField}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitOrderByField(AlertExpressionParser.OrderByFieldContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#limitClause}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLimitClause(AlertExpressionParser.LimitClauseContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#relList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitRelList(AlertExpressionParser.RelListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#relation}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitRelation(AlertExpressionParser.RelationContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#conditionList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitConditionList(AlertExpressionParser.ConditionListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#compOp}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitCompOp(AlertExpressionParser.CompOpContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#condition}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitCondition(AlertExpressionParser.ConditionContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#conditionUnit}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitConditionUnit(AlertExpressionParser.ConditionUnitContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#promql}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitPromql(AlertExpressionParser.PromqlContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#metricSelector}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitMetricSelector(AlertExpressionParser.MetricSelectorContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#labelMatcherList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLabelMatcherList(AlertExpressionParser.LabelMatcherListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#labelMatcherItem}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLabelMatcherItem(AlertExpressionParser.LabelMatcherItemContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#labelMatcherOp}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLabelMatcherOp(AlertExpressionParser.LabelMatcherOpContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#labelList}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLabelList(AlertExpressionParser.LabelListContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#instantVectorOp}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitInstantVectorOp(AlertExpressionParser.InstantVectorOpContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#aggregationOperator}.
     *
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitAggregationOperator(AlertExpressionParser.AggregationOperatorContext ctx);
}