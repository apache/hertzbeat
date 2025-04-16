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
 * operations with no return type.
 */
public interface AlertExpressionVisitor<T> extends ParseTreeVisitor<T> {

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#expression}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitExpression(AlertExpressionParser.ExpressionContext ctx);

    /**
     * Visit a parse tree produced by the {@code AndExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitAndExpr(AlertExpressionParser.AndExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code QueryExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitQueryExpr(AlertExpressionParser.QueryExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code ComparisonExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitComparisonExpr(AlertExpressionParser.ComparisonExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code UnlessExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitUnlessExpr(AlertExpressionParser.UnlessExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code LiteralExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitLiteralExpr(AlertExpressionParser.LiteralExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code ParenExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitParenExpr(AlertExpressionParser.ParenExprContext ctx);

    /**
     * Visit a parse tree produced by the {@code OrExpr}
     * labeled alternative in AlertExpressionParser#expr
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitOrExpr(AlertExpressionParser.OrExprContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#identifier}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitIdentifier(AlertExpressionParser.IdentifierContext ctx);

    /**
     * Visit a parse tree produced by {@link AlertExpressionParser#number}.
     * @param ctx the parse tree
     * @return the visitor result
     */
    T visitNumber(AlertExpressionParser.NumberContext ctx);
}