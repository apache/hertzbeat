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

package org.apache.hertzbeat.alert.dsl;


// Generated from ThresholdExpression.g4 by ANTLR 4.13.2
import org.antlr.v4.runtime.tree.ParseTreeListener;

/**
 * This interface defines a complete listener for a parse tree produced by
 * {@link ThresholdExpressionParser}.
 */
public interface ThresholdExpressionListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by the {@code ComparisonExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void enterComparisonExpr(ThresholdExpressionParser.ComparisonExprContext ctx);
	/**
	 * Exit a parse tree produced by the {@code ComparisonExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void exitComparisonExpr(ThresholdExpressionParser.ComparisonExprContext ctx);
	/**
	 * Enter a parse tree produced by the {@code QueryExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void enterQueryExpr(ThresholdExpressionParser.QueryExprContext ctx);
	/**
	 * Exit a parse tree produced by the {@code QueryExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void exitQueryExpr(ThresholdExpressionParser.QueryExprContext ctx);
	/**
	 * Enter a parse tree produced by the {@code UnlessExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void enterUnlessExpr(ThresholdExpressionParser.UnlessExprContext ctx);
	/**
	 * Exit a parse tree produced by the {@code UnlessExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void exitUnlessExpr(ThresholdExpressionParser.UnlessExprContext ctx);
	/**
	 * Enter a parse tree produced by the {@code LiteralExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void enterLiteralExpr(ThresholdExpressionParser.LiteralExprContext ctx);
	/**
	 * Exit a parse tree produced by the {@code LiteralExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void exitLiteralExpr(ThresholdExpressionParser.LiteralExprContext ctx);
	/**
	 * Enter a parse tree produced by the {@code ParenExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void enterParenExpr(ThresholdExpressionParser.ParenExprContext ctx);
	/**
	 * Exit a parse tree produced by the {@code ParenExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void exitParenExpr(ThresholdExpressionParser.ParenExprContext ctx);
	/**
	 * Enter a parse tree produced by the {@code LogicalExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void enterLogicalExpr(ThresholdExpressionParser.LogicalExprContext ctx);
	/**
	 * Exit a parse tree produced by the {@code LogicalExpr}
	 * labeled alternative in {@link ThresholdExpressionParser#expr}.
	 * @param ctx the parse tree
	 */
	void exitLogicalExpr(ThresholdExpressionParser.LogicalExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link ThresholdExpressionParser#identifier}.
	 * @param ctx the parse tree
	 */
	void enterIdentifier(ThresholdExpressionParser.IdentifierContext ctx);
	/**
	 * Exit a parse tree produced by {@link ThresholdExpressionParser#identifier}.
	 * @param ctx the parse tree
	 */
	void exitIdentifier(ThresholdExpressionParser.IdentifierContext ctx);
	/**
	 * Enter a parse tree produced by {@link ThresholdExpressionParser#number}.
	 * @param ctx the parse tree
	 */
	void enterNumber(ThresholdExpressionParser.NumberContext ctx);
	/**
	 * Exit a parse tree produced by {@link ThresholdExpressionParser#number}.
	 * @param ctx the parse tree
	 */
	void exitNumber(ThresholdExpressionParser.NumberContext ctx);
}