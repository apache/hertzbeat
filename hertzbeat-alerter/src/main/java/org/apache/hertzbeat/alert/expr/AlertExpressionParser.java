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

import org.antlr.v4.runtime.FailedPredicateException;
import org.antlr.v4.runtime.NoViableAltException;
import org.antlr.v4.runtime.Parser;
import org.antlr.v4.runtime.ParserRuleContext;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.RuleContext;
import org.antlr.v4.runtime.RuntimeMetaData;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.TokenStream;
import org.antlr.v4.runtime.Vocabulary;
import org.antlr.v4.runtime.VocabularyImpl;
import org.antlr.v4.runtime.atn.ATN;
import org.antlr.v4.runtime.atn.ATNDeserializer;
import org.antlr.v4.runtime.atn.ParserATNSimulator;
import org.antlr.v4.runtime.atn.PredictionContextCache;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.tree.ParseTreeVisitor;
import org.antlr.v4.runtime.tree.TerminalNode;

import java.util.List;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue", "this-escape"})
public class AlertExpressionParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.2", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
			new PredictionContextCache();
	public static final int
			AND=1, OR=2, UNLESS=3, NOT=4, SELECT=5, FROM=6, WHERE=7, GROUP=8, BY=9,
			HAVING=10, ORDER=11, LIMIT=12, OFFSET=13, AS=14, ASC=15, DESC=16, IN=17,
			IS=18, NULL=19, LIKE=20, BETWEEN=21, EXISTS=22, STAR=23, COUNT=24, SUM=25,
			AVG=26, MIN=27, MAX=28, STDDEV=29, STDVAR=30, VARIANCE=31, RATE_FUNCTION=32,
			INCREASE_FUNCTION=33, HISTOGRAM_QUANTILE_FUNCTION=34, TOPK=35, BOTTOMK=36,
			QUANTILE=37, BY_FUNCTION=38, WITHOUT_FUNCTION=39, GROUP_LEFT_FUNCTION=40,
			GROUP_RIGHT_FUNCTION=41, IGNORING_FUNCTION=42, ON_FUNCTION=43, GT=44,
			GE=45, LT=46, LE=47, EQ=48, NE=49, LPAREN=50, RPAREN=51, LBRACE=52, RBRACE=53,
			LBRACKET=54, RBRACKET=55, COMMA=56, DOT=57, COLON=58, SEMICOLON=59, SCIENTIFIC_NUMBER=60,
			FLOAT=61, NUMBER=62, DURATION=63, STRING=64, IDENTIFIER=65, WS=66, LINE_COMMENT=67,
			BLOCK_COMMENT=68;
	public static final int
			RULE_expression = 0, RULE_expr = 1, RULE_functionCall = 2, RULE_parameterList = 3,
			RULE_parameter = 4, RULE_number = 5, RULE_string = 6, RULE_duration = 7,
			RULE_functionName = 8, RULE_selectSql = 9, RULE_selectFieldList = 10,
			RULE_selectField = 11, RULE_groupByList = 12, RULE_orderByList = 13, RULE_orderByField = 14,
			RULE_limitClause = 15, RULE_relList = 16, RULE_relation = 17, RULE_conditionList = 18,
			RULE_compOp = 19, RULE_condition = 20, RULE_conditionExpr = 21, RULE_promql = 22,
			RULE_metricSelector = 23, RULE_labelMatcherList = 24, RULE_labelMatcherItem = 25,
			RULE_labelMatcherOp = 26, RULE_labelList = 27, RULE_instantVectorOp = 28,
			RULE_aggregationOperator = 29, RULE_binaryOperator = 30;
	private static String[] makeRuleNames() {
		return new String[] {
				"expression", "expr", "functionCall", "parameterList", "parameter", "number",
				"string", "duration", "functionName", "selectSql", "selectFieldList",
				"selectField", "groupByList", "orderByList", "orderByField", "limitClause",
				"relList", "relation", "conditionList", "compOp", "condition", "conditionExpr",
				"promql", "metricSelector", "labelMatcherList", "labelMatcherItem", "labelMatcherOp",
				"labelList", "instantVectorOp", "aggregationOperator", "binaryOperator"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
				null, null, null, null, null, null, null, null, null, null, null, null,
				null, null, null, null, null, null, null, null, null, null, null, "'*'",
				null, null, null, null, null, null, null, null, null, null, null, null,
				null, null, null, null, null, null, null, null, "'>'", "'>='", "'<'",
				"'<='", null, "'!='", "'('", "')'", "'{'", "'}'", "'['", "']'", "','",
				"'.'", "':'", "';'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
				null, "AND", "OR", "UNLESS", "NOT", "SELECT", "FROM", "WHERE", "GROUP",
				"BY", "HAVING", "ORDER", "LIMIT", "OFFSET", "AS", "ASC", "DESC", "IN",
				"IS", "NULL", "LIKE", "BETWEEN", "EXISTS", "STAR", "COUNT", "SUM", "AVG",
				"MIN", "MAX", "STDDEV", "STDVAR", "VARIANCE", "RATE_FUNCTION", "INCREASE_FUNCTION",
				"HISTOGRAM_QUANTILE_FUNCTION", "TOPK", "BOTTOMK", "QUANTILE", "BY_FUNCTION",
				"WITHOUT_FUNCTION", "GROUP_LEFT_FUNCTION", "GROUP_RIGHT_FUNCTION", "IGNORING_FUNCTION",
				"ON_FUNCTION", "GT", "GE", "LT", "LE", "EQ", "NE", "LPAREN", "RPAREN",
				"LBRACE", "RBRACE", "LBRACKET", "RBRACKET", "COMMA", "DOT", "COLON",
				"SEMICOLON", "SCIENTIFIC_NUMBER", "FLOAT", "NUMBER", "DURATION", "STRING",
				"IDENTIFIER", "WS", "LINE_COMMENT", "BLOCK_COMMENT"
		};
	}
	private static final String[] _SYMBOLIC_NAMES = makeSymbolicNames();
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}

	@Override
	public String getGrammarFileName() { return "AlertExpression.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public AlertExpressionParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ExpressionContext extends ParserRuleContext {
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public TerminalNode EOF() { return getToken(AlertExpressionParser.EOF, 0); }
		public ExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expression; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitExpression(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ExpressionContext expression() throws RecognitionException {
		ExpressionContext _localctx = new ExpressionContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_expression);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(62);
				expr(0);
				setState(63);
				match(EOF);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ExprContext extends ParserRuleContext {
		public ExprContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expr; }

		public ExprContext() { }
		public void copyFrom(ExprContext ctx) {
			super.copyFrom(ctx);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class AndExprContext extends ExprContext {
		public ExprContext left;
		public ExprContext right;
		public TerminalNode AND() { return getToken(AlertExpressionParser.AND, 0); }
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public AndExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitAndExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class ComparisonExprContext extends ExprContext {
		public ExprContext left;
		public Token op;
		public ExprContext right;
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public TerminalNode GE() { return getToken(AlertExpressionParser.GE, 0); }
		public TerminalNode LE() { return getToken(AlertExpressionParser.LE, 0); }
		public TerminalNode GT() { return getToken(AlertExpressionParser.GT, 0); }
		public TerminalNode LT() { return getToken(AlertExpressionParser.LT, 0); }
		public TerminalNode EQ() { return getToken(AlertExpressionParser.EQ, 0); }
		public TerminalNode NE() { return getToken(AlertExpressionParser.NE, 0); }
		public ComparisonExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitComparisonExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class UnlessExprContext extends ExprContext {
		public ExprContext left;
		public ExprContext right;
		public TerminalNode UNLESS() { return getToken(AlertExpressionParser.UNLESS, 0); }
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public UnlessExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitUnlessExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class SqlExprContext extends ExprContext {
		public SelectSqlContext selectSql() {
			return getRuleContext(SelectSqlContext.class,0);
		}
		public SqlExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitSqlExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class LiteralExprContext extends ExprContext {
		public NumberContext number() {
			return getRuleContext(NumberContext.class,0);
		}
		public LiteralExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitLiteralExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class ParenExprContext extends ExprContext {
		public TerminalNode LPAREN() { return getToken(AlertExpressionParser.LPAREN, 0); }
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(AlertExpressionParser.RPAREN, 0); }
		public ParenExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitParenExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class PromqlExprContext extends ExprContext {
		public PromqlContext promql() {
			return getRuleContext(PromqlContext.class,0);
		}
		public PromqlExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitPromqlExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class OrExprContext extends ExprContext {
		public ExprContext left;
		public ExprContext right;
		public TerminalNode OR() { return getToken(AlertExpressionParser.OR, 0); }
		public List<ExprContext> expr() {
			return getRuleContexts(ExprContext.class);
		}
		public ExprContext expr(int i) {
			return getRuleContext(ExprContext.class,i);
		}
		public OrExprContext(ExprContext ctx) { copyFrom(ctx); }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitOrExpr(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ExprContext expr() throws RecognitionException {
		return expr(0);
	}

	private ExprContext expr(int _p) throws RecognitionException {
		ParserRuleContext _parentctx = _ctx;
		int _parentState = getState();
		ExprContext _localctx = new ExprContext(_ctx, _parentState);
		ExprContext _prevctx = _localctx;
		int _startState = 2;
		enterRecursionRule(_localctx, 2, RULE_expr, _p);
		int _la;
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
				setState(73);
				_errHandler.sync(this);
				switch (_input.LA(1)) {
					case LPAREN:
					{
						_localctx = new ParenExprContext(_localctx);
						_ctx = _localctx;
						_prevctx = _localctx;

						setState(66);
						match(LPAREN);
						setState(67);
						expr(0);
						setState(68);
						match(RPAREN);
					}
					break;
					case COUNT:
					case SUM:
					case AVG:
					case MIN:
					case MAX:
					case STDDEV:
					case STDVAR:
					case RATE_FUNCTION:
					case INCREASE_FUNCTION:
					case HISTOGRAM_QUANTILE_FUNCTION:
					case TOPK:
					case BOTTOMK:
					case QUANTILE:
					case BY_FUNCTION:
					case WITHOUT_FUNCTION:
					case GROUP_LEFT_FUNCTION:
					case GROUP_RIGHT_FUNCTION:
					case IGNORING_FUNCTION:
					case ON_FUNCTION:
					case LBRACE:
					case IDENTIFIER:
					{
						_localctx = new PromqlExprContext(_localctx);
						_ctx = _localctx;
						_prevctx = _localctx;
						setState(70);
						promql(0);
					}
					break;
					case SELECT:
					{
						_localctx = new SqlExprContext(_localctx);
						_ctx = _localctx;
						_prevctx = _localctx;
						setState(71);
						selectSql();
					}
					break;
					case SCIENTIFIC_NUMBER:
					case FLOAT:
					case NUMBER:
					{
						_localctx = new LiteralExprContext(_localctx);
						_ctx = _localctx;
						_prevctx = _localctx;
						setState(72);
						number();
					}
					break;
					default:
						throw new NoViableAltException(this);
				}
				_ctx.stop = _input.LT(-1);
				setState(89);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,2,_ctx);
				while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
					if ( _alt==1 ) {
						if ( _parseListeners!=null ) triggerExitRuleEvent();
						_prevctx = _localctx;
						{
							setState(87);
							_errHandler.sync(this);
							switch ( getInterpreter().adaptivePredict(_input,1,_ctx) ) {
								case 1:
								{
									_localctx = new ComparisonExprContext(new ExprContext(_parentctx, _parentState));
									((ComparisonExprContext)_localctx).left = _prevctx;
									pushNewRecursionContext(_localctx, _startState, RULE_expr);
									setState(75);
									if (!(precpred(_ctx, 7))) throw new FailedPredicateException(this, "precpred(_ctx, 7)");
									setState(76);
									((ComparisonExprContext)_localctx).op = _input.LT(1);
									_la = _input.LA(1);
									if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 1108307720798208L) != 0)) ) {
										((ComparisonExprContext)_localctx).op = (Token)_errHandler.recoverInline(this);
									}
									else {
										if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
										_errHandler.reportMatch(this);
										consume();
									}
									setState(77);
									((ComparisonExprContext)_localctx).right = expr(8);
								}
								break;
								case 2:
								{
									_localctx = new AndExprContext(new ExprContext(_parentctx, _parentState));
									((AndExprContext)_localctx).left = _prevctx;
									pushNewRecursionContext(_localctx, _startState, RULE_expr);
									setState(78);
									if (!(precpred(_ctx, 6))) throw new FailedPredicateException(this, "precpred(_ctx, 6)");
									setState(79);
									match(AND);
									setState(80);
									((AndExprContext)_localctx).right = expr(7);
								}
								break;
								case 3:
								{
									_localctx = new UnlessExprContext(new ExprContext(_parentctx, _parentState));
									((UnlessExprContext)_localctx).left = _prevctx;
									pushNewRecursionContext(_localctx, _startState, RULE_expr);
									setState(81);
									if (!(precpred(_ctx, 5))) throw new FailedPredicateException(this, "precpred(_ctx, 5)");
									setState(82);
									match(UNLESS);
									setState(83);
									((UnlessExprContext)_localctx).right = expr(6);
								}
								break;
								case 4:
								{
									_localctx = new OrExprContext(new ExprContext(_parentctx, _parentState));
									((OrExprContext)_localctx).left = _prevctx;
									pushNewRecursionContext(_localctx, _startState, RULE_expr);
									setState(84);
									if (!(precpred(_ctx, 4))) throw new FailedPredicateException(this, "precpred(_ctx, 4)");
									setState(85);
									match(OR);
									setState(86);
									((OrExprContext)_localctx).right = expr(5);
								}
								break;
							}
						}
					}
					setState(91);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,2,_ctx);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FunctionCallContext extends ParserRuleContext {
		public FunctionNameContext functionName() {
			return getRuleContext(FunctionNameContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(AlertExpressionParser.LPAREN, 0); }
		public ParameterListContext parameterList() {
			return getRuleContext(ParameterListContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(AlertExpressionParser.RPAREN, 0); }
		public FunctionCallContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionCall; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitFunctionCall(this);
			else return visitor.visitChildren(this);
		}
	}

	public final FunctionCallContext functionCall() throws RecognitionException {
		FunctionCallContext _localctx = new FunctionCallContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_functionCall);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(92);
				functionName();
				setState(93);
				match(LPAREN);
				setState(94);
				parameterList();
				setState(95);
				match(RPAREN);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ParameterListContext extends ParserRuleContext {
		public List<ParameterContext> parameter() {
			return getRuleContexts(ParameterContext.class);
		}
		public ParameterContext parameter(int i) {
			return getRuleContext(ParameterContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public ParameterListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_parameterList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitParameterList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ParameterListContext parameterList() throws RecognitionException {
		ParameterListContext _localctx = new ParameterListContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_parameterList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(97);
				parameter();
				setState(102);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==COMMA) {
					{
						{
							setState(98);
							match(COMMA);
							setState(99);
							parameter();
						}
					}
					setState(104);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ParameterContext extends ParserRuleContext {
		public ExprContext expr() {
			return getRuleContext(ExprContext.class,0);
		}
		public TerminalNode STAR() { return getToken(AlertExpressionParser.STAR, 0); }
		public StringContext string() {
			return getRuleContext(StringContext.class,0);
		}
		public DurationContext duration() {
			return getRuleContext(DurationContext.class,0);
		}
		public ParameterContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_parameter; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitParameter(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ParameterContext parameter() throws RecognitionException {
		ParameterContext _localctx = new ParameterContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_parameter);
		try {
			setState(109);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
				case SELECT:
				case COUNT:
				case SUM:
				case AVG:
				case MIN:
				case MAX:
				case STDDEV:
				case STDVAR:
				case RATE_FUNCTION:
				case INCREASE_FUNCTION:
				case HISTOGRAM_QUANTILE_FUNCTION:
				case TOPK:
				case BOTTOMK:
				case QUANTILE:
				case BY_FUNCTION:
				case WITHOUT_FUNCTION:
				case GROUP_LEFT_FUNCTION:
				case GROUP_RIGHT_FUNCTION:
				case IGNORING_FUNCTION:
				case ON_FUNCTION:
				case LPAREN:
				case LBRACE:
				case SCIENTIFIC_NUMBER:
				case FLOAT:
				case NUMBER:
				case IDENTIFIER:
					enterOuterAlt(_localctx, 1);
				{
					setState(105);
					expr(0);
				}
				break;
				case STAR:
					enterOuterAlt(_localctx, 2);
				{
					setState(106);
					match(STAR);
				}
				break;
				case STRING:
					enterOuterAlt(_localctx, 3);
				{
					setState(107);
					string();
				}
				break;
				case DURATION:
					enterOuterAlt(_localctx, 4);
				{
					setState(108);
					duration();
				}
				break;
				default:
					throw new NoViableAltException(this);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class NumberContext extends ParserRuleContext {
		public TerminalNode NUMBER() { return getToken(AlertExpressionParser.NUMBER, 0); }
		public TerminalNode FLOAT() { return getToken(AlertExpressionParser.FLOAT, 0); }
		public TerminalNode SCIENTIFIC_NUMBER() { return getToken(AlertExpressionParser.SCIENTIFIC_NUMBER, 0); }
		public NumberContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_number; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitNumber(this);
			else return visitor.visitChildren(this);
		}
	}

	public final NumberContext number() throws RecognitionException {
		NumberContext _localctx = new NumberContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_number);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(111);
				_la = _input.LA(1);
				if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 8070450532247928832L) != 0)) ) {
					_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class StringContext extends ParserRuleContext {
		public TerminalNode STRING() { return getToken(AlertExpressionParser.STRING, 0); }
		public StringContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_string; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitString(this);
			else return visitor.visitChildren(this);
		}
	}

	public final StringContext string() throws RecognitionException {
		StringContext _localctx = new StringContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_string);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(113);
				match(STRING);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class DurationContext extends ParserRuleContext {
		public TerminalNode DURATION() { return getToken(AlertExpressionParser.DURATION, 0); }
		public DurationContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_duration; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitDuration(this);
			else return visitor.visitChildren(this);
		}
	}

	public final DurationContext duration() throws RecognitionException {
		DurationContext _localctx = new DurationContext(_ctx, getState());
		enterRule(_localctx, 14, RULE_duration);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(115);
				match(DURATION);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FunctionNameContext extends ParserRuleContext {
		public TerminalNode COUNT() { return getToken(AlertExpressionParser.COUNT, 0); }
		public TerminalNode AVG() { return getToken(AlertExpressionParser.AVG, 0); }
		public TerminalNode SUM() { return getToken(AlertExpressionParser.SUM, 0); }
		public TerminalNode MIN() { return getToken(AlertExpressionParser.MIN, 0); }
		public TerminalNode MAX() { return getToken(AlertExpressionParser.MAX, 0); }
		public TerminalNode RATE_FUNCTION() { return getToken(AlertExpressionParser.RATE_FUNCTION, 0); }
		public TerminalNode INCREASE_FUNCTION() { return getToken(AlertExpressionParser.INCREASE_FUNCTION, 0); }
		public TerminalNode HISTOGRAM_QUANTILE_FUNCTION() { return getToken(AlertExpressionParser.HISTOGRAM_QUANTILE_FUNCTION, 0); }
		public TerminalNode BY_FUNCTION() { return getToken(AlertExpressionParser.BY_FUNCTION, 0); }
		public TerminalNode WITHOUT_FUNCTION() { return getToken(AlertExpressionParser.WITHOUT_FUNCTION, 0); }
		public TerminalNode GROUP_LEFT_FUNCTION() { return getToken(AlertExpressionParser.GROUP_LEFT_FUNCTION, 0); }
		public TerminalNode GROUP_RIGHT_FUNCTION() { return getToken(AlertExpressionParser.GROUP_RIGHT_FUNCTION, 0); }
		public TerminalNode IGNORING_FUNCTION() { return getToken(AlertExpressionParser.IGNORING_FUNCTION, 0); }
		public TerminalNode ON_FUNCTION() { return getToken(AlertExpressionParser.ON_FUNCTION, 0); }
		public TerminalNode IDENTIFIER() { return getToken(AlertExpressionParser.IDENTIFIER, 0); }
		public FunctionNameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionName; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitFunctionName(this);
			else return visitor.visitChildren(this);
		}
	}

	public final FunctionNameContext functionName() throws RecognitionException {
		FunctionNameContext _localctx = new FunctionNameContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_functionName);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(117);
				_la = _input.LA(1);
				if ( !(((((_la - 24)) & ~0x3f) == 0 && ((1L << (_la - 24)) & 2199024289567L) != 0)) ) {
					_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class SelectSqlContext extends ParserRuleContext {
		public TerminalNode SELECT() { return getToken(AlertExpressionParser.SELECT, 0); }
		public SelectFieldListContext selectFieldList() {
			return getRuleContext(SelectFieldListContext.class,0);
		}
		public TerminalNode FROM() { return getToken(AlertExpressionParser.FROM, 0); }
		public RelListContext relList() {
			return getRuleContext(RelListContext.class,0);
		}
		public TerminalNode WHERE() { return getToken(AlertExpressionParser.WHERE, 0); }
		public List<ConditionListContext> conditionList() {
			return getRuleContexts(ConditionListContext.class);
		}
		public ConditionListContext conditionList(int i) {
			return getRuleContext(ConditionListContext.class,i);
		}
		public TerminalNode GROUP() { return getToken(AlertExpressionParser.GROUP, 0); }
		public List<TerminalNode> BY() { return getTokens(AlertExpressionParser.BY); }
		public TerminalNode BY(int i) {
			return getToken(AlertExpressionParser.BY, i);
		}
		public GroupByListContext groupByList() {
			return getRuleContext(GroupByListContext.class,0);
		}
		public TerminalNode HAVING() { return getToken(AlertExpressionParser.HAVING, 0); }
		public TerminalNode ORDER() { return getToken(AlertExpressionParser.ORDER, 0); }
		public OrderByListContext orderByList() {
			return getRuleContext(OrderByListContext.class,0);
		}
		public TerminalNode LIMIT() { return getToken(AlertExpressionParser.LIMIT, 0); }
		public LimitClauseContext limitClause() {
			return getRuleContext(LimitClauseContext.class,0);
		}
		public SelectSqlContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectSql; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitSelectSql(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SelectSqlContext selectSql() throws RecognitionException {
		SelectSqlContext _localctx = new SelectSqlContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_selectSql);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(119);
				match(SELECT);
				setState(120);
				selectFieldList();
				setState(121);
				match(FROM);
				setState(122);
				relList();
				setState(125);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,5,_ctx) ) {
					case 1:
					{
						setState(123);
						match(WHERE);
						setState(124);
						conditionList();
					}
					break;
				}
				setState(130);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,6,_ctx) ) {
					case 1:
					{
						setState(127);
						match(GROUP);
						setState(128);
						match(BY);
						setState(129);
						groupByList();
					}
					break;
				}
				setState(134);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,7,_ctx) ) {
					case 1:
					{
						setState(132);
						match(HAVING);
						setState(133);
						conditionList();
					}
					break;
				}
				setState(139);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,8,_ctx) ) {
					case 1:
					{
						setState(136);
						match(ORDER);
						setState(137);
						match(BY);
						setState(138);
						orderByList();
					}
					break;
				}
				setState(143);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,9,_ctx) ) {
					case 1:
					{
						setState(141);
						match(LIMIT);
						setState(142);
						limitClause();
					}
					break;
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class SelectFieldListContext extends ParserRuleContext {
		public List<SelectFieldContext> selectField() {
			return getRuleContexts(SelectFieldContext.class);
		}
		public SelectFieldContext selectField(int i) {
			return getRuleContext(SelectFieldContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public SelectFieldListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectFieldList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitSelectFieldList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SelectFieldListContext selectFieldList() throws RecognitionException {
		SelectFieldListContext _localctx = new SelectFieldListContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_selectFieldList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(145);
				selectField();
				setState(150);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==COMMA) {
					{
						{
							setState(146);
							match(COMMA);
							setState(147);
							selectField();
						}
					}
					setState(152);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class SelectFieldContext extends ParserRuleContext {
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public List<TerminalNode> IDENTIFIER() { return getTokens(AlertExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(AlertExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode AS() { return getToken(AlertExpressionParser.AS, 0); }
		public TerminalNode STAR() { return getToken(AlertExpressionParser.STAR, 0); }
		public TerminalNode DOT() { return getToken(AlertExpressionParser.DOT, 0); }
		public SelectFieldContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectField; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitSelectField(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SelectFieldContext selectField() throws RecognitionException {
		SelectFieldContext _localctx = new SelectFieldContext(_ctx, getState());
		enterRule(_localctx, 22, RULE_selectField);
		int _la;
		try {
			setState(183);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,19,_ctx) ) {
				case 1:
					enterOuterAlt(_localctx, 1);
				{
					setState(153);
					functionCall();
					setState(158);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS || _la==IDENTIFIER) {
						{
							setState(155);
							_errHandler.sync(this);
							_la = _input.LA(1);
							if (_la==AS) {
								{
									setState(154);
									match(AS);
								}
							}

							setState(157);
							match(IDENTIFIER);
						}
					}

				}
				break;
				case 2:
					enterOuterAlt(_localctx, 2);
				{
					setState(160);
					match(IDENTIFIER);
					setState(165);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS || _la==IDENTIFIER) {
						{
							setState(162);
							_errHandler.sync(this);
							_la = _input.LA(1);
							if (_la==AS) {
								{
									setState(161);
									match(AS);
								}
							}

							setState(164);
							match(IDENTIFIER);
						}
					}

				}
				break;
				case 3:
					enterOuterAlt(_localctx, 3);
				{
					setState(167);
					match(STAR);
					setState(172);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS || _la==IDENTIFIER) {
						{
							setState(169);
							_errHandler.sync(this);
							_la = _input.LA(1);
							if (_la==AS) {
								{
									setState(168);
									match(AS);
								}
							}

							setState(171);
							match(IDENTIFIER);
						}
					}

				}
				break;
				case 4:
					enterOuterAlt(_localctx, 4);
				{
					setState(174);
					match(IDENTIFIER);
					setState(175);
					match(DOT);
					setState(176);
					match(IDENTIFIER);
					setState(181);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS || _la==IDENTIFIER) {
						{
							setState(178);
							_errHandler.sync(this);
							_la = _input.LA(1);
							if (_la==AS) {
								{
									setState(177);
									match(AS);
								}
							}

							setState(180);
							match(IDENTIFIER);
						}
					}

				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class GroupByListContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(AlertExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(AlertExpressionParser.IDENTIFIER, i);
		}
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public GroupByListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_groupByList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitGroupByList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final GroupByListContext groupByList() throws RecognitionException {
		GroupByListContext _localctx = new GroupByListContext(_ctx, getState());
		enterRule(_localctx, 24, RULE_groupByList);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
				setState(185);
				match(IDENTIFIER);
				setState(190);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,20,_ctx);
				while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
					if ( _alt==1 ) {
						{
							{
								setState(186);
								match(COMMA);
								setState(187);
								match(IDENTIFIER);
							}
						}
					}
					setState(192);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,20,_ctx);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class OrderByListContext extends ParserRuleContext {
		public List<OrderByFieldContext> orderByField() {
			return getRuleContexts(OrderByFieldContext.class);
		}
		public OrderByFieldContext orderByField(int i) {
			return getRuleContext(OrderByFieldContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public OrderByListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_orderByList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitOrderByList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final OrderByListContext orderByList() throws RecognitionException {
		OrderByListContext _localctx = new OrderByListContext(_ctx, getState());
		enterRule(_localctx, 26, RULE_orderByList);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
				setState(193);
				orderByField();
				setState(198);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,21,_ctx);
				while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
					if ( _alt==1 ) {
						{
							{
								setState(194);
								match(COMMA);
								setState(195);
								orderByField();
							}
						}
					}
					setState(200);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,21,_ctx);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class OrderByFieldContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(AlertExpressionParser.IDENTIFIER, 0); }
		public TerminalNode ASC() { return getToken(AlertExpressionParser.ASC, 0); }
		public TerminalNode DESC() { return getToken(AlertExpressionParser.DESC, 0); }
		public OrderByFieldContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_orderByField; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitOrderByField(this);
			else return visitor.visitChildren(this);
		}
	}

	public final OrderByFieldContext orderByField() throws RecognitionException {
		OrderByFieldContext _localctx = new OrderByFieldContext(_ctx, getState());
		enterRule(_localctx, 28, RULE_orderByField);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(201);
				match(IDENTIFIER);
				setState(203);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,22,_ctx) ) {
					case 1:
					{
						setState(202);
						_la = _input.LA(1);
						if ( !(_la==ASC || _la==DESC) ) {
							_errHandler.recoverInline(this);
						}
						else {
							if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
							_errHandler.reportMatch(this);
							consume();
						}
					}
					break;
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class LimitClauseContext extends ParserRuleContext {
		public TerminalNode NUMBER() { return getToken(AlertExpressionParser.NUMBER, 0); }
		public LimitClauseContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_limitClause; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitLimitClause(this);
			else return visitor.visitChildren(this);
		}
	}

	public final LimitClauseContext limitClause() throws RecognitionException {
		LimitClauseContext _localctx = new LimitClauseContext(_ctx, getState());
		enterRule(_localctx, 30, RULE_limitClause);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(205);
				match(NUMBER);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class RelListContext extends ParserRuleContext {
		public List<RelationContext> relation() {
			return getRuleContexts(RelationContext.class);
		}
		public RelationContext relation(int i) {
			return getRuleContext(RelationContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public RelListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_relList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitRelList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final RelListContext relList() throws RecognitionException {
		RelListContext _localctx = new RelListContext(_ctx, getState());
		enterRule(_localctx, 32, RULE_relList);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
				setState(207);
				relation();
				setState(212);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,23,_ctx);
				while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
					if ( _alt==1 ) {
						{
							{
								setState(208);
								match(COMMA);
								setState(209);
								relation();
							}
						}
					}
					setState(214);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,23,_ctx);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class RelationContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(AlertExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(AlertExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode AS() { return getToken(AlertExpressionParser.AS, 0); }
		public TerminalNode LPAREN() { return getToken(AlertExpressionParser.LPAREN, 0); }
		public SelectSqlContext selectSql() {
			return getRuleContext(SelectSqlContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(AlertExpressionParser.RPAREN, 0); }
		public RelationContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_relation; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitRelation(this);
			else return visitor.visitChildren(this);
		}
	}

	public final RelationContext relation() throws RecognitionException {
		RelationContext _localctx = new RelationContext(_ctx, getState());
		enterRule(_localctx, 34, RULE_relation);
		int _la;
		try {
			setState(228);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
				case IDENTIFIER:
					enterOuterAlt(_localctx, 1);
				{
					setState(215);
					match(IDENTIFIER);
					setState(220);
					_errHandler.sync(this);
					switch ( getInterpreter().adaptivePredict(_input,25,_ctx) ) {
						case 1:
						{
							setState(217);
							_errHandler.sync(this);
							_la = _input.LA(1);
							if (_la==AS) {
								{
									setState(216);
									match(AS);
								}
							}

							setState(219);
							match(IDENTIFIER);
						}
						break;
					}
				}
				break;
				case LPAREN:
					enterOuterAlt(_localctx, 2);
				{
					setState(222);
					match(LPAREN);
					setState(223);
					selectSql();
					setState(224);
					match(RPAREN);
					setState(225);
					match(AS);
					setState(226);
					match(IDENTIFIER);
				}
				break;
				default:
					throw new NoViableAltException(this);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ConditionListContext extends ParserRuleContext {
		public List<ConditionContext> condition() {
			return getRuleContexts(ConditionContext.class);
		}
		public ConditionContext condition(int i) {
			return getRuleContext(ConditionContext.class,i);
		}
		public List<TerminalNode> AND() { return getTokens(AlertExpressionParser.AND); }
		public TerminalNode AND(int i) {
			return getToken(AlertExpressionParser.AND, i);
		}
		public List<TerminalNode> OR() { return getTokens(AlertExpressionParser.OR); }
		public TerminalNode OR(int i) {
			return getToken(AlertExpressionParser.OR, i);
		}
		public ConditionListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_conditionList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitConditionList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ConditionListContext conditionList() throws RecognitionException {
		ConditionListContext _localctx = new ConditionListContext(_ctx, getState());
		enterRule(_localctx, 36, RULE_conditionList);
		try {
			int _alt;
			setState(246);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,29,_ctx) ) {
				case 1:
					enterOuterAlt(_localctx, 1);
				{
					setState(230);
					condition();
					setState(235);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,27,_ctx);
					while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
						if ( _alt==1 ) {
							{
								{
									setState(231);
									match(AND);
									setState(232);
									condition();
								}
							}
						}
						setState(237);
						_errHandler.sync(this);
						_alt = getInterpreter().adaptivePredict(_input,27,_ctx);
					}
				}
				break;
				case 2:
					enterOuterAlt(_localctx, 2);
				{
					setState(238);
					condition();
					setState(243);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,28,_ctx);
					while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
						if ( _alt==1 ) {
							{
								{
									setState(239);
									match(OR);
									setState(240);
									condition();
								}
							}
						}
						setState(245);
						_errHandler.sync(this);
						_alt = getInterpreter().adaptivePredict(_input,28,_ctx);
					}
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class CompOpContext extends ParserRuleContext {
		public TerminalNode EQ() { return getToken(AlertExpressionParser.EQ, 0); }
		public TerminalNode LT() { return getToken(AlertExpressionParser.LT, 0); }
		public TerminalNode GT() { return getToken(AlertExpressionParser.GT, 0); }
		public TerminalNode LE() { return getToken(AlertExpressionParser.LE, 0); }
		public TerminalNode GE() { return getToken(AlertExpressionParser.GE, 0); }
		public TerminalNode NE() { return getToken(AlertExpressionParser.NE, 0); }
		public TerminalNode LIKE() { return getToken(AlertExpressionParser.LIKE, 0); }
		public TerminalNode NOT() { return getToken(AlertExpressionParser.NOT, 0); }
		public TerminalNode IN() { return getToken(AlertExpressionParser.IN, 0); }
		public TerminalNode IS() { return getToken(AlertExpressionParser.IS, 0); }
		public CompOpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_compOp; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitCompOp(this);
			else return visitor.visitChildren(this);
		}
	}

	public final CompOpContext compOp() throws RecognitionException {
		CompOpContext _localctx = new CompOpContext(_ctx, getState());
		enterRule(_localctx, 38, RULE_compOp);
		try {
			setState(263);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,30,_ctx) ) {
				case 1:
					enterOuterAlt(_localctx, 1);
				{
					setState(248);
					match(EQ);
				}
				break;
				case 2:
					enterOuterAlt(_localctx, 2);
				{
					setState(249);
					match(LT);
				}
				break;
				case 3:
					enterOuterAlt(_localctx, 3);
				{
					setState(250);
					match(GT);
				}
				break;
				case 4:
					enterOuterAlt(_localctx, 4);
				{
					setState(251);
					match(LE);
				}
				break;
				case 5:
					enterOuterAlt(_localctx, 5);
				{
					setState(252);
					match(GE);
				}
				break;
				case 6:
					enterOuterAlt(_localctx, 6);
				{
					setState(253);
					match(NE);
				}
				break;
				case 7:
					enterOuterAlt(_localctx, 7);
				{
					setState(254);
					match(LIKE);
				}
				break;
				case 8:
					enterOuterAlt(_localctx, 8);
				{
					setState(255);
					match(NOT);
					setState(256);
					match(LIKE);
				}
				break;
				case 9:
					enterOuterAlt(_localctx, 9);
				{
					setState(257);
					match(IN);
				}
				break;
				case 10:
					enterOuterAlt(_localctx, 10);
				{
					setState(258);
					match(NOT);
					setState(259);
					match(IN);
				}
				break;
				case 11:
					enterOuterAlt(_localctx, 11);
				{
					setState(260);
					match(IS);
				}
				break;
				case 12:
					enterOuterAlt(_localctx, 12);
				{
					setState(261);
					match(NOT);
					setState(262);
					match(IS);
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ConditionContext extends ParserRuleContext {
		public List<ConditionExprContext> conditionExpr() {
			return getRuleContexts(ConditionExprContext.class);
		}
		public ConditionExprContext conditionExpr(int i) {
			return getRuleContext(ConditionExprContext.class,i);
		}
		public CompOpContext compOp() {
			return getRuleContext(CompOpContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(AlertExpressionParser.LPAREN, 0); }
		public ConditionContext condition() {
			return getRuleContext(ConditionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(AlertExpressionParser.RPAREN, 0); }
		public List<TerminalNode> IDENTIFIER() { return getTokens(AlertExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(AlertExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode BETWEEN() { return getToken(AlertExpressionParser.BETWEEN, 0); }
		public TerminalNode AND() { return getToken(AlertExpressionParser.AND, 0); }
		public ConditionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_condition; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitCondition(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ConditionContext condition() throws RecognitionException {
		ConditionContext _localctx = new ConditionContext(_ctx, getState());
		enterRule(_localctx, 40, RULE_condition);
		try {
			setState(278);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,31,_ctx) ) {
				case 1:
					enterOuterAlt(_localctx, 1);
				{
					setState(265);
					conditionExpr();
					setState(266);
					compOp();
					setState(267);
					conditionExpr();
				}
				break;
				case 2:
					enterOuterAlt(_localctx, 2);
				{
					setState(269);
					match(LPAREN);
					setState(270);
					condition();
					setState(271);
					match(RPAREN);
				}
				break;
				case 3:
					enterOuterAlt(_localctx, 3);
				{
					setState(273);
					match(IDENTIFIER);
					setState(274);
					match(BETWEEN);
					setState(275);
					match(IDENTIFIER);
					setState(276);
					match(AND);
					setState(277);
					match(IDENTIFIER);
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ConditionExprContext extends ParserRuleContext {
		public NumberContext number() {
			return getRuleContext(NumberContext.class,0);
		}
		public StringContext string() {
			return getRuleContext(StringContext.class,0);
		}
		public List<TerminalNode> IDENTIFIER() { return getTokens(AlertExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(AlertExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode DOT() { return getToken(AlertExpressionParser.DOT, 0); }
		public SelectSqlContext selectSql() {
			return getRuleContext(SelectSqlContext.class,0);
		}
		public ConditionExprContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_conditionExpr; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitConditionExpr(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ConditionExprContext conditionExpr() throws RecognitionException {
		ConditionExprContext _localctx = new ConditionExprContext(_ctx, getState());
		enterRule(_localctx, 42, RULE_conditionExpr);
		try {
			setState(287);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,32,_ctx) ) {
				case 1:
					enterOuterAlt(_localctx, 1);
				{
					setState(280);
					number();
				}
				break;
				case 2:
					enterOuterAlt(_localctx, 2);
				{
					setState(281);
					string();
				}
				break;
				case 3:
					enterOuterAlt(_localctx, 3);
				{
					setState(282);
					match(IDENTIFIER);
				}
				break;
				case 4:
					enterOuterAlt(_localctx, 4);
				{
					setState(283);
					match(IDENTIFIER);
					setState(284);
					match(DOT);
					setState(285);
					match(IDENTIFIER);
				}
				break;
				case 5:
					enterOuterAlt(_localctx, 5);
				{
					setState(286);
					selectSql();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class PromqlContext extends ParserRuleContext {
		public MetricSelectorContext metricSelector() {
			return getRuleContext(MetricSelectorContext.class,0);
		}
		public InstantVectorOpContext instantVectorOp() {
			return getRuleContext(InstantVectorOpContext.class,0);
		}
		public AggregationOperatorContext aggregationOperator() {
			return getRuleContext(AggregationOperatorContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(AlertExpressionParser.LPAREN, 0); }
		public List<PromqlContext> promql() {
			return getRuleContexts(PromqlContext.class);
		}
		public PromqlContext promql(int i) {
			return getRuleContext(PromqlContext.class,i);
		}
		public TerminalNode RPAREN() { return getToken(AlertExpressionParser.RPAREN, 0); }
		public TerminalNode BY() { return getToken(AlertExpressionParser.BY, 0); }
		public LabelListContext labelList() {
			return getRuleContext(LabelListContext.class,0);
		}
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public TerminalNode IDENTIFIER() { return getToken(AlertExpressionParser.IDENTIFIER, 0); }
		public BinaryOperatorContext binaryOperator() {
			return getRuleContext(BinaryOperatorContext.class,0);
		}
		public TerminalNode LBRACKET() { return getToken(AlertExpressionParser.LBRACKET, 0); }
		public List<DurationContext> duration() {
			return getRuleContexts(DurationContext.class);
		}
		public DurationContext duration(int i) {
			return getRuleContext(DurationContext.class,i);
		}
		public TerminalNode RBRACKET() { return getToken(AlertExpressionParser.RBRACKET, 0); }
		public TerminalNode COLON() { return getToken(AlertExpressionParser.COLON, 0); }
		public TerminalNode OFFSET() { return getToken(AlertExpressionParser.OFFSET, 0); }
		public PromqlContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_promql; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitPromql(this);
			else return visitor.visitChildren(this);
		}
	}

	public final PromqlContext promql() throws RecognitionException {
		return promql(0);
	}

	private PromqlContext promql(int _p) throws RecognitionException {
		ParserRuleContext _parentctx = _ctx;
		int _parentState = getState();
		PromqlContext _localctx = new PromqlContext(_ctx, _parentState);
		PromqlContext _prevctx = _localctx;
		int _startState = 44;
		enterRecursionRule(_localctx, 44, RULE_promql, _p);
		int _la;
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
				setState(305);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,35,_ctx) ) {
					case 1:
					{
						setState(290);
						metricSelector();
						setState(292);
						_errHandler.sync(this);
						switch ( getInterpreter().adaptivePredict(_input,33,_ctx) ) {
							case 1:
							{
								setState(291);
								instantVectorOp();
							}
							break;
						}
					}
					break;
					case 2:
					{
						setState(294);
						aggregationOperator();
						setState(295);
						match(LPAREN);
						setState(296);
						promql(0);
						setState(299);
						_errHandler.sync(this);
						_la = _input.LA(1);
						if (_la==BY) {
							{
								setState(297);
								match(BY);
								setState(298);
								labelList();
							}
						}

						setState(301);
						match(RPAREN);
					}
					break;
					case 3:
					{
						setState(303);
						functionCall();
					}
					break;
					case 4:
					{
						setState(304);
						match(IDENTIFIER);
					}
					break;
				}
				_ctx.stop = _input.LT(-1);
				setState(328);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,37,_ctx);
				while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
					if ( _alt==1 ) {
						if ( _parseListeners!=null ) triggerExitRuleEvent();
						_prevctx = _localctx;
						{
							setState(326);
							_errHandler.sync(this);
							switch ( getInterpreter().adaptivePredict(_input,36,_ctx) ) {
								case 1:
								{
									_localctx = new PromqlContext(_parentctx, _parentState);
									pushNewRecursionContext(_localctx, _startState, RULE_promql);
									setState(307);
									if (!(precpred(_ctx, 6))) throw new FailedPredicateException(this, "precpred(_ctx, 6)");
									setState(308);
									binaryOperator();
									setState(309);
									promql(7);
								}
								break;
								case 2:
								{
									_localctx = new PromqlContext(_parentctx, _parentState);
									pushNewRecursionContext(_localctx, _startState, RULE_promql);
									setState(311);
									if (!(precpred(_ctx, 4))) throw new FailedPredicateException(this, "precpred(_ctx, 4)");
									setState(312);
									match(LBRACKET);
									setState(313);
									duration();
									setState(314);
									match(RBRACKET);
								}
								break;
								case 3:
								{
									_localctx = new PromqlContext(_parentctx, _parentState);
									pushNewRecursionContext(_localctx, _startState, RULE_promql);
									setState(316);
									if (!(precpred(_ctx, 3))) throw new FailedPredicateException(this, "precpred(_ctx, 3)");
									setState(317);
									match(LBRACKET);
									setState(318);
									duration();
									setState(319);
									match(COLON);
									setState(320);
									duration();
									setState(321);
									match(RBRACKET);
								}
								break;
								case 4:
								{
									_localctx = new PromqlContext(_parentctx, _parentState);
									pushNewRecursionContext(_localctx, _startState, RULE_promql);
									setState(323);
									if (!(precpred(_ctx, 2))) throw new FailedPredicateException(this, "precpred(_ctx, 2)");
									setState(324);
									match(OFFSET);
									setState(325);
									duration();
								}
								break;
							}
						}
					}
					setState(330);
					_errHandler.sync(this);
					_alt = getInterpreter().adaptivePredict(_input,37,_ctx);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class MetricSelectorContext extends ParserRuleContext {
		public TerminalNode LBRACE() { return getToken(AlertExpressionParser.LBRACE, 0); }
		public TerminalNode RBRACE() { return getToken(AlertExpressionParser.RBRACE, 0); }
		public LabelMatcherListContext labelMatcherList() {
			return getRuleContext(LabelMatcherListContext.class,0);
		}
		public MetricSelectorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_metricSelector; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitMetricSelector(this);
			else return visitor.visitChildren(this);
		}
	}

	public final MetricSelectorContext metricSelector() throws RecognitionException {
		MetricSelectorContext _localctx = new MetricSelectorContext(_ctx, getState());
		enterRule(_localctx, 46, RULE_metricSelector);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(331);
				match(LBRACE);
				setState(333);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==IDENTIFIER) {
					{
						setState(332);
						labelMatcherList();
					}
				}

				setState(335);
				match(RBRACE);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class LabelMatcherListContext extends ParserRuleContext {
		public List<LabelMatcherItemContext> labelMatcherItem() {
			return getRuleContexts(LabelMatcherItemContext.class);
		}
		public LabelMatcherItemContext labelMatcherItem(int i) {
			return getRuleContext(LabelMatcherItemContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public LabelMatcherListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_labelMatcherList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitLabelMatcherList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final LabelMatcherListContext labelMatcherList() throws RecognitionException {
		LabelMatcherListContext _localctx = new LabelMatcherListContext(_ctx, getState());
		enterRule(_localctx, 48, RULE_labelMatcherList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(337);
				labelMatcherItem();
				setState(342);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==COMMA) {
					{
						{
							setState(338);
							match(COMMA);
							setState(339);
							labelMatcherItem();
						}
					}
					setState(344);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class LabelMatcherItemContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(AlertExpressionParser.IDENTIFIER, 0); }
		public LabelMatcherOpContext labelMatcherOp() {
			return getRuleContext(LabelMatcherOpContext.class,0);
		}
		public StringContext string() {
			return getRuleContext(StringContext.class,0);
		}
		public LabelMatcherItemContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_labelMatcherItem; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitLabelMatcherItem(this);
			else return visitor.visitChildren(this);
		}
	}

	public final LabelMatcherItemContext labelMatcherItem() throws RecognitionException {
		LabelMatcherItemContext _localctx = new LabelMatcherItemContext(_ctx, getState());
		enterRule(_localctx, 50, RULE_labelMatcherItem);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(345);
				match(IDENTIFIER);
				setState(346);
				labelMatcherOp();
				setState(347);
				string();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class LabelMatcherOpContext extends ParserRuleContext {
		public TerminalNode EQ() { return getToken(AlertExpressionParser.EQ, 0); }
		public TerminalNode NE() { return getToken(AlertExpressionParser.NE, 0); }
		public LabelMatcherOpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_labelMatcherOp; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitLabelMatcherOp(this);
			else return visitor.visitChildren(this);
		}
	}

	public final LabelMatcherOpContext labelMatcherOp() throws RecognitionException {
		LabelMatcherOpContext _localctx = new LabelMatcherOpContext(_ctx, getState());
		enterRule(_localctx, 52, RULE_labelMatcherOp);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(349);
				_la = _input.LA(1);
				if ( !(_la==EQ || _la==NE) ) {
					_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class LabelListContext extends ParserRuleContext {
		public TerminalNode LPAREN() { return getToken(AlertExpressionParser.LPAREN, 0); }
		public List<TerminalNode> IDENTIFIER() { return getTokens(AlertExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(AlertExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode RPAREN() { return getToken(AlertExpressionParser.RPAREN, 0); }
		public List<TerminalNode> COMMA() { return getTokens(AlertExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(AlertExpressionParser.COMMA, i);
		}
		public LabelListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_labelList; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitLabelList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final LabelListContext labelList() throws RecognitionException {
		LabelListContext _localctx = new LabelListContext(_ctx, getState());
		enterRule(_localctx, 54, RULE_labelList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(351);
				match(LPAREN);
				setState(352);
				match(IDENTIFIER);
				setState(357);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==COMMA) {
					{
						{
							setState(353);
							match(COMMA);
							setState(354);
							match(IDENTIFIER);
						}
					}
					setState(359);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
				setState(360);
				match(RPAREN);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class InstantVectorOpContext extends ParserRuleContext {
		public TerminalNode LBRACKET() { return getToken(AlertExpressionParser.LBRACKET, 0); }
		public DurationContext duration() {
			return getRuleContext(DurationContext.class,0);
		}
		public TerminalNode RBRACKET() { return getToken(AlertExpressionParser.RBRACKET, 0); }
		public InstantVectorOpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_instantVectorOp; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitInstantVectorOp(this);
			else return visitor.visitChildren(this);
		}
	}

	public final InstantVectorOpContext instantVectorOp() throws RecognitionException {
		InstantVectorOpContext _localctx = new InstantVectorOpContext(_ctx, getState());
		enterRule(_localctx, 56, RULE_instantVectorOp);
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(362);
				match(LBRACKET);
				setState(363);
				duration();
				setState(364);
				match(RBRACKET);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class AggregationOperatorContext extends ParserRuleContext {
		public TerminalNode SUM() { return getToken(AlertExpressionParser.SUM, 0); }
		public TerminalNode AVG() { return getToken(AlertExpressionParser.AVG, 0); }
		public TerminalNode COUNT() { return getToken(AlertExpressionParser.COUNT, 0); }
		public TerminalNode MIN() { return getToken(AlertExpressionParser.MIN, 0); }
		public TerminalNode MAX() { return getToken(AlertExpressionParser.MAX, 0); }
		public TerminalNode STDDEV() { return getToken(AlertExpressionParser.STDDEV, 0); }
		public TerminalNode STDVAR() { return getToken(AlertExpressionParser.STDVAR, 0); }
		public TerminalNode TOPK() { return getToken(AlertExpressionParser.TOPK, 0); }
		public TerminalNode BOTTOMK() { return getToken(AlertExpressionParser.BOTTOMK, 0); }
		public TerminalNode QUANTILE() { return getToken(AlertExpressionParser.QUANTILE, 0); }
		public AggregationOperatorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_aggregationOperator; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitAggregationOperator(this);
			else return visitor.visitChildren(this);
		}
	}

	public final AggregationOperatorContext aggregationOperator() throws RecognitionException {
		AggregationOperatorContext _localctx = new AggregationOperatorContext(_ctx, getState());
		enterRule(_localctx, 58, RULE_aggregationOperator);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(366);
				_la = _input.LA(1);
				if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 242648875008L) != 0)) ) {
					_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class BinaryOperatorContext extends ParserRuleContext {
		public TerminalNode EQ() { return getToken(AlertExpressionParser.EQ, 0); }
		public TerminalNode NE() { return getToken(AlertExpressionParser.NE, 0); }
		public TerminalNode GT() { return getToken(AlertExpressionParser.GT, 0); }
		public TerminalNode LT() { return getToken(AlertExpressionParser.LT, 0); }
		public TerminalNode GE() { return getToken(AlertExpressionParser.GE, 0); }
		public TerminalNode LE() { return getToken(AlertExpressionParser.LE, 0); }
		public TerminalNode AND() { return getToken(AlertExpressionParser.AND, 0); }
		public TerminalNode OR() { return getToken(AlertExpressionParser.OR, 0); }
		public TerminalNode UNLESS() { return getToken(AlertExpressionParser.UNLESS, 0); }
		public BinaryOperatorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_binaryOperator; }
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof AlertExpressionVisitor ) return ((AlertExpressionVisitor<? extends T>)visitor).visitBinaryOperator(this);
			else return visitor.visitChildren(this);
		}
	}

	public final BinaryOperatorContext binaryOperator() throws RecognitionException {
		BinaryOperatorContext _localctx = new BinaryOperatorContext(_ctx, getState());
		enterRule(_localctx, 60, RULE_binaryOperator);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
				setState(368);
				_la = _input.LA(1);
				if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 1108307720798222L) != 0)) ) {
					_errHandler.recoverInline(this);
				}
				else {
					if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
					_errHandler.reportMatch(this);
					consume();
				}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public boolean sempred(RuleContext _localctx, int ruleIndex, int predIndex) {
		switch (ruleIndex) {
			case 1:
				return expr_sempred((ExprContext)_localctx, predIndex);
			case 22:
				return promql_sempred((PromqlContext)_localctx, predIndex);
		}
		return true;
	}
	private boolean expr_sempred(ExprContext _localctx, int predIndex) {
		switch (predIndex) {
			case 0:
				return precpred(_ctx, 7);
			case 1:
				return precpred(_ctx, 6);
			case 2:
				return precpred(_ctx, 5);
			case 3:
				return precpred(_ctx, 4);
		}
		return true;
	}
	private boolean promql_sempred(PromqlContext _localctx, int predIndex) {
		switch (predIndex) {
			case 4:
				return precpred(_ctx, 6);
			case 5:
				return precpred(_ctx, 4);
			case 6:
				return precpred(_ctx, 3);
			case 7:
				return precpred(_ctx, 2);
		}
		return true;
	}

	public static final String _serializedATN =
			"\u0004\u0001D\u0173\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002"+
					"\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002"+
					"\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007\u0007\u0007\u0002"+
					"\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b\u0007\u000b\u0002"+
					"\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002\u000f\u0007\u000f"+
					"\u0002\u0010\u0007\u0010\u0002\u0011\u0007\u0011\u0002\u0012\u0007\u0012"+
					"\u0002\u0013\u0007\u0013\u0002\u0014\u0007\u0014\u0002\u0015\u0007\u0015"+
					"\u0002\u0016\u0007\u0016\u0002\u0017\u0007\u0017\u0002\u0018\u0007\u0018"+
					"\u0002\u0019\u0007\u0019\u0002\u001a\u0007\u001a\u0002\u001b\u0007\u001b"+
					"\u0002\u001c\u0007\u001c\u0002\u001d\u0007\u001d\u0002\u001e\u0007\u001e"+
					"\u0001\u0000\u0001\u0000\u0001\u0000\u0001\u0001\u0001\u0001\u0001\u0001"+
					"\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0003\u0001"+
					"J\b\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001"+
					"\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001"+
					"\u0001\u0001\u0005\u0001X\b\u0001\n\u0001\f\u0001[\t\u0001\u0001\u0002"+
					"\u0001\u0002\u0001\u0002\u0001\u0002\u0001\u0002\u0001\u0003\u0001\u0003"+
					"\u0001\u0003\u0005\u0003e\b\u0003\n\u0003\f\u0003h\t\u0003\u0001\u0004"+
					"\u0001\u0004\u0001\u0004\u0001\u0004\u0003\u0004n\b\u0004\u0001\u0005"+
					"\u0001\u0005\u0001\u0006\u0001\u0006\u0001\u0007\u0001\u0007\u0001\b\u0001"+
					"\b\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0003\t~\b\t\u0001"+
					"\t\u0001\t\u0001\t\u0003\t\u0083\b\t\u0001\t\u0001\t\u0003\t\u0087\b\t"+
					"\u0001\t\u0001\t\u0001\t\u0003\t\u008c\b\t\u0001\t\u0001\t\u0003\t\u0090"+
					"\b\t\u0001\n\u0001\n\u0001\n\u0005\n\u0095\b\n\n\n\f\n\u0098\t\n\u0001"+
					"\u000b\u0001\u000b\u0003\u000b\u009c\b\u000b\u0001\u000b\u0003\u000b\u009f"+
					"\b\u000b\u0001\u000b\u0001\u000b\u0003\u000b\u00a3\b\u000b\u0001\u000b"+
					"\u0003\u000b\u00a6\b\u000b\u0001\u000b\u0001\u000b\u0003\u000b\u00aa\b"+
					"\u000b\u0001\u000b\u0003\u000b\u00ad\b\u000b\u0001\u000b\u0001\u000b\u0001"+
					"\u000b\u0001\u000b\u0003\u000b\u00b3\b\u000b\u0001\u000b\u0003\u000b\u00b6"+
					"\b\u000b\u0003\u000b\u00b8\b\u000b\u0001\f\u0001\f\u0001\f\u0005\f\u00bd"+
					"\b\f\n\f\f\f\u00c0\t\f\u0001\r\u0001\r\u0001\r\u0005\r\u00c5\b\r\n\r\f"+
					"\r\u00c8\t\r\u0001\u000e\u0001\u000e\u0003\u000e\u00cc\b\u000e\u0001\u000f"+
					"\u0001\u000f\u0001\u0010\u0001\u0010\u0001\u0010\u0005\u0010\u00d3\b\u0010"+
					"\n\u0010\f\u0010\u00d6\t\u0010\u0001\u0011\u0001\u0011\u0003\u0011\u00da"+
					"\b\u0011\u0001\u0011\u0003\u0011\u00dd\b\u0011\u0001\u0011\u0001\u0011"+
					"\u0001\u0011\u0001\u0011\u0001\u0011\u0001\u0011\u0003\u0011\u00e5\b\u0011"+
					"\u0001\u0012\u0001\u0012\u0001\u0012\u0005\u0012\u00ea\b\u0012\n\u0012"+
					"\f\u0012\u00ed\t\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0005\u0012"+
					"\u00f2\b\u0012\n\u0012\f\u0012\u00f5\t\u0012\u0003\u0012\u00f7\b\u0012"+
					"\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013"+
					"\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013"+
					"\u0001\u0013\u0001\u0013\u0001\u0013\u0003\u0013\u0108\b\u0013\u0001\u0014"+
					"\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014"+
					"\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014"+
					"\u0003\u0014\u0117\b\u0014\u0001\u0015\u0001\u0015\u0001\u0015\u0001\u0015"+
					"\u0001\u0015\u0001\u0015\u0001\u0015\u0003\u0015\u0120\b\u0015\u0001\u0016"+
					"\u0001\u0016\u0001\u0016\u0003\u0016\u0125\b\u0016\u0001\u0016\u0001\u0016"+
					"\u0001\u0016\u0001\u0016\u0001\u0016\u0003\u0016\u012c\b\u0016\u0001\u0016"+
					"\u0001\u0016\u0001\u0016\u0001\u0016\u0003\u0016\u0132\b\u0016\u0001\u0016"+
					"\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016"+
					"\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016"+
					"\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016"+
					"\u0005\u0016\u0147\b\u0016\n\u0016\f\u0016\u014a\t\u0016\u0001\u0017\u0001"+
					"\u0017\u0003\u0017\u014e\b\u0017\u0001\u0017\u0001\u0017\u0001\u0018\u0001"+
					"\u0018\u0001\u0018\u0005\u0018\u0155\b\u0018\n\u0018\f\u0018\u0158\t\u0018"+
					"\u0001\u0019\u0001\u0019\u0001\u0019\u0001\u0019\u0001\u001a\u0001\u001a"+
					"\u0001\u001b\u0001\u001b\u0001\u001b\u0001\u001b\u0005\u001b\u0164\b\u001b"+
					"\n\u001b\f\u001b\u0167\t\u001b\u0001\u001b\u0001\u001b\u0001\u001c\u0001"+
					"\u001c\u0001\u001c\u0001\u001c\u0001\u001d\u0001\u001d\u0001\u001e\u0001"+
					"\u001e\u0001\u001e\u0000\u0002\u0002,\u001f\u0000\u0002\u0004\u0006\b"+
					"\n\f\u000e\u0010\u0012\u0014\u0016\u0018\u001a\u001c\u001e \"$&(*,.02"+
					"468:<\u0000\u0007\u0001\u0000,1\u0001\u0000<>\u0004\u0000\u0018\u001c"+
					" \"&+AA\u0001\u0000\u000f\u0010\u0001\u000001\u0002\u0000\u0018\u001e"+
					"#%\u0002\u0000\u0001\u0003,1\u0196\u0000>\u0001\u0000\u0000\u0000\u0002"+
					"I\u0001\u0000\u0000\u0000\u0004\\\u0001\u0000\u0000\u0000\u0006a\u0001"+
					"\u0000\u0000\u0000\bm\u0001\u0000\u0000\u0000\no\u0001\u0000\u0000\u0000"+
					"\fq\u0001\u0000\u0000\u0000\u000es\u0001\u0000\u0000\u0000\u0010u\u0001"+
					"\u0000\u0000\u0000\u0012w\u0001\u0000\u0000\u0000\u0014\u0091\u0001\u0000"+
					"\u0000\u0000\u0016\u00b7\u0001\u0000\u0000\u0000\u0018\u00b9\u0001\u0000"+
					"\u0000\u0000\u001a\u00c1\u0001\u0000\u0000\u0000\u001c\u00c9\u0001\u0000"+
					"\u0000\u0000\u001e\u00cd\u0001\u0000\u0000\u0000 \u00cf\u0001\u0000\u0000"+
					"\u0000\"\u00e4\u0001\u0000\u0000\u0000$\u00f6\u0001\u0000\u0000\u0000"+
					"&\u0107\u0001\u0000\u0000\u0000(\u0116\u0001\u0000\u0000\u0000*\u011f"+
					"\u0001\u0000\u0000\u0000,\u0131\u0001\u0000\u0000\u0000.\u014b\u0001\u0000"+
					"\u0000\u00000\u0151\u0001\u0000\u0000\u00002\u0159\u0001\u0000\u0000\u0000"+
					"4\u015d\u0001\u0000\u0000\u00006\u015f\u0001\u0000\u0000\u00008\u016a"+
					"\u0001\u0000\u0000\u0000:\u016e\u0001\u0000\u0000\u0000<\u0170\u0001\u0000"+
					"\u0000\u0000>?\u0003\u0002\u0001\u0000?@\u0005\u0000\u0000\u0001@\u0001"+
					"\u0001\u0000\u0000\u0000AB\u0006\u0001\uffff\uffff\u0000BC\u00052\u0000"+
					"\u0000CD\u0003\u0002\u0001\u0000DE\u00053\u0000\u0000EJ\u0001\u0000\u0000"+
					"\u0000FJ\u0003,\u0016\u0000GJ\u0003\u0012\t\u0000HJ\u0003\n\u0005\u0000"+
					"IA\u0001\u0000\u0000\u0000IF\u0001\u0000\u0000\u0000IG\u0001\u0000\u0000"+
					"\u0000IH\u0001\u0000\u0000\u0000JY\u0001\u0000\u0000\u0000KL\n\u0007\u0000"+
					"\u0000LM\u0007\u0000\u0000\u0000MX\u0003\u0002\u0001\bNO\n\u0006\u0000"+
					"\u0000OP\u0005\u0001\u0000\u0000PX\u0003\u0002\u0001\u0007QR\n\u0005\u0000"+
					"\u0000RS\u0005\u0003\u0000\u0000SX\u0003\u0002\u0001\u0006TU\n\u0004\u0000"+
					"\u0000UV\u0005\u0002\u0000\u0000VX\u0003\u0002\u0001\u0005WK\u0001\u0000"+
					"\u0000\u0000WN\u0001\u0000\u0000\u0000WQ\u0001\u0000\u0000\u0000WT\u0001"+
					"\u0000\u0000\u0000X[\u0001\u0000\u0000\u0000YW\u0001\u0000\u0000\u0000"+
					"YZ\u0001\u0000\u0000\u0000Z\u0003\u0001\u0000\u0000\u0000[Y\u0001\u0000"+
					"\u0000\u0000\\]\u0003\u0010\b\u0000]^\u00052\u0000\u0000^_\u0003\u0006"+
					"\u0003\u0000_`\u00053\u0000\u0000`\u0005\u0001\u0000\u0000\u0000af\u0003"+
					"\b\u0004\u0000bc\u00058\u0000\u0000ce\u0003\b\u0004\u0000db\u0001\u0000"+
					"\u0000\u0000eh\u0001\u0000\u0000\u0000fd\u0001\u0000\u0000\u0000fg\u0001"+
					"\u0000\u0000\u0000g\u0007\u0001\u0000\u0000\u0000hf\u0001\u0000\u0000"+
					"\u0000in\u0003\u0002\u0001\u0000jn\u0005\u0017\u0000\u0000kn\u0003\f\u0006"+
					"\u0000ln\u0003\u000e\u0007\u0000mi\u0001\u0000\u0000\u0000mj\u0001\u0000"+
					"\u0000\u0000mk\u0001\u0000\u0000\u0000ml\u0001\u0000\u0000\u0000n\t\u0001"+
					"\u0000\u0000\u0000op\u0007\u0001\u0000\u0000p\u000b\u0001\u0000\u0000"+
					"\u0000qr\u0005@\u0000\u0000r\r\u0001\u0000\u0000\u0000st\u0005?\u0000"+
					"\u0000t\u000f\u0001\u0000\u0000\u0000uv\u0007\u0002\u0000\u0000v\u0011"+
					"\u0001\u0000\u0000\u0000wx\u0005\u0005\u0000\u0000xy\u0003\u0014\n\u0000"+
					"yz\u0005\u0006\u0000\u0000z}\u0003 \u0010\u0000{|\u0005\u0007\u0000\u0000"+
					"|~\u0003$\u0012\u0000}{\u0001\u0000\u0000\u0000}~\u0001\u0000\u0000\u0000"+
					"~\u0082\u0001\u0000\u0000\u0000\u007f\u0080\u0005\b\u0000\u0000\u0080"+
					"\u0081\u0005\t\u0000\u0000\u0081\u0083\u0003\u0018\f\u0000\u0082\u007f"+
					"\u0001\u0000\u0000\u0000\u0082\u0083\u0001\u0000\u0000\u0000\u0083\u0086"+
					"\u0001\u0000\u0000\u0000\u0084\u0085\u0005\n\u0000\u0000\u0085\u0087\u0003"+
					"$\u0012\u0000\u0086\u0084\u0001\u0000\u0000\u0000\u0086\u0087\u0001\u0000"+
					"\u0000\u0000\u0087\u008b\u0001\u0000\u0000\u0000\u0088\u0089\u0005\u000b"+
					"\u0000\u0000\u0089\u008a\u0005\t\u0000\u0000\u008a\u008c\u0003\u001a\r"+
					"\u0000\u008b\u0088\u0001\u0000\u0000\u0000\u008b\u008c\u0001\u0000\u0000"+
					"\u0000\u008c\u008f\u0001\u0000\u0000\u0000\u008d\u008e\u0005\f\u0000\u0000"+
					"\u008e\u0090\u0003\u001e\u000f\u0000\u008f\u008d\u0001\u0000\u0000\u0000"+
					"\u008f\u0090\u0001\u0000\u0000\u0000\u0090\u0013\u0001\u0000\u0000\u0000"+
					"\u0091\u0096\u0003\u0016\u000b\u0000\u0092\u0093\u00058\u0000\u0000\u0093"+
					"\u0095\u0003\u0016\u000b\u0000\u0094\u0092\u0001\u0000\u0000\u0000\u0095"+
					"\u0098\u0001\u0000\u0000\u0000\u0096\u0094\u0001\u0000\u0000\u0000\u0096"+
					"\u0097\u0001\u0000\u0000\u0000\u0097\u0015\u0001\u0000\u0000\u0000\u0098"+
					"\u0096\u0001\u0000\u0000\u0000\u0099\u009e\u0003\u0004\u0002\u0000\u009a"+
					"\u009c\u0005\u000e\u0000\u0000\u009b\u009a\u0001\u0000\u0000\u0000\u009b"+
					"\u009c\u0001\u0000\u0000\u0000\u009c\u009d\u0001\u0000\u0000\u0000\u009d"+
					"\u009f\u0005A\u0000\u0000\u009e\u009b\u0001\u0000\u0000\u0000\u009e\u009f"+
					"\u0001\u0000\u0000\u0000\u009f\u00b8\u0001\u0000\u0000\u0000\u00a0\u00a5"+
					"\u0005A\u0000\u0000\u00a1\u00a3\u0005\u000e\u0000\u0000\u00a2\u00a1\u0001"+
					"\u0000\u0000\u0000\u00a2\u00a3\u0001\u0000\u0000\u0000\u00a3\u00a4\u0001"+
					"\u0000\u0000\u0000\u00a4\u00a6\u0005A\u0000\u0000\u00a5\u00a2\u0001\u0000"+
					"\u0000\u0000\u00a5\u00a6\u0001\u0000\u0000\u0000\u00a6\u00b8\u0001\u0000"+
					"\u0000\u0000\u00a7\u00ac\u0005\u0017\u0000\u0000\u00a8\u00aa\u0005\u000e"+
					"\u0000\u0000\u00a9\u00a8\u0001\u0000\u0000\u0000\u00a9\u00aa\u0001\u0000"+
					"\u0000\u0000\u00aa\u00ab\u0001\u0000\u0000\u0000\u00ab\u00ad\u0005A\u0000"+
					"\u0000\u00ac\u00a9\u0001\u0000\u0000\u0000\u00ac\u00ad\u0001\u0000\u0000"+
					"\u0000\u00ad\u00b8\u0001\u0000\u0000\u0000\u00ae\u00af\u0005A\u0000\u0000"+
					"\u00af\u00b0\u00059\u0000\u0000\u00b0\u00b5\u0005A\u0000\u0000\u00b1\u00b3"+
					"\u0005\u000e\u0000\u0000\u00b2\u00b1\u0001\u0000\u0000\u0000\u00b2\u00b3"+
					"\u0001\u0000\u0000\u0000\u00b3\u00b4\u0001\u0000\u0000\u0000\u00b4\u00b6"+
					"\u0005A\u0000\u0000\u00b5\u00b2\u0001\u0000\u0000\u0000\u00b5\u00b6\u0001"+
					"\u0000\u0000\u0000\u00b6\u00b8\u0001\u0000\u0000\u0000\u00b7\u0099\u0001"+
					"\u0000\u0000\u0000\u00b7\u00a0\u0001\u0000\u0000\u0000\u00b7\u00a7\u0001"+
					"\u0000\u0000\u0000\u00b7\u00ae\u0001\u0000\u0000\u0000\u00b8\u0017\u0001"+
					"\u0000\u0000\u0000\u00b9\u00be\u0005A\u0000\u0000\u00ba\u00bb\u00058\u0000"+
					"\u0000\u00bb\u00bd\u0005A\u0000\u0000\u00bc\u00ba\u0001\u0000\u0000\u0000"+
					"\u00bd\u00c0\u0001\u0000\u0000\u0000\u00be\u00bc\u0001\u0000\u0000\u0000"+
					"\u00be\u00bf\u0001\u0000\u0000\u0000\u00bf\u0019\u0001\u0000\u0000\u0000"+
					"\u00c0\u00be\u0001\u0000\u0000\u0000\u00c1\u00c6\u0003\u001c\u000e\u0000"+
					"\u00c2\u00c3\u00058\u0000\u0000\u00c3\u00c5\u0003\u001c\u000e\u0000\u00c4"+
					"\u00c2\u0001\u0000\u0000\u0000\u00c5\u00c8\u0001\u0000\u0000\u0000\u00c6"+
					"\u00c4\u0001\u0000\u0000\u0000\u00c6\u00c7\u0001\u0000\u0000\u0000\u00c7"+
					"\u001b\u0001\u0000\u0000\u0000\u00c8\u00c6\u0001\u0000\u0000\u0000\u00c9"+
					"\u00cb\u0005A\u0000\u0000\u00ca\u00cc\u0007\u0003\u0000\u0000\u00cb\u00ca"+
					"\u0001\u0000\u0000\u0000\u00cb\u00cc\u0001\u0000\u0000\u0000\u00cc\u001d"+
					"\u0001\u0000\u0000\u0000\u00cd\u00ce\u0005>\u0000\u0000\u00ce\u001f\u0001"+
					"\u0000\u0000\u0000\u00cf\u00d4\u0003\"\u0011\u0000\u00d0\u00d1\u00058"+
					"\u0000\u0000\u00d1\u00d3\u0003\"\u0011\u0000\u00d2\u00d0\u0001\u0000\u0000"+
					"\u0000\u00d3\u00d6\u0001\u0000\u0000\u0000\u00d4\u00d2\u0001\u0000\u0000"+
					"\u0000\u00d4\u00d5\u0001\u0000\u0000\u0000\u00d5!\u0001\u0000\u0000\u0000"+
					"\u00d6\u00d4\u0001\u0000\u0000\u0000\u00d7\u00dc\u0005A\u0000\u0000\u00d8"+
					"\u00da\u0005\u000e\u0000\u0000\u00d9\u00d8\u0001\u0000\u0000\u0000\u00d9"+
					"\u00da\u0001\u0000\u0000\u0000\u00da\u00db\u0001\u0000\u0000\u0000\u00db"+
					"\u00dd\u0005A\u0000\u0000\u00dc\u00d9\u0001\u0000\u0000\u0000\u00dc\u00dd"+
					"\u0001\u0000\u0000\u0000\u00dd\u00e5\u0001\u0000\u0000\u0000\u00de\u00df"+
					"\u00052\u0000\u0000\u00df\u00e0\u0003\u0012\t\u0000\u00e0\u00e1\u0005"+
					"3\u0000\u0000\u00e1\u00e2\u0005\u000e\u0000\u0000\u00e2\u00e3\u0005A\u0000"+
					"\u0000\u00e3\u00e5\u0001\u0000\u0000\u0000\u00e4\u00d7\u0001\u0000\u0000"+
					"\u0000\u00e4\u00de\u0001\u0000\u0000\u0000\u00e5#\u0001\u0000\u0000\u0000"+
					"\u00e6\u00eb\u0003(\u0014\u0000\u00e7\u00e8\u0005\u0001\u0000\u0000\u00e8"+
					"\u00ea\u0003(\u0014\u0000\u00e9\u00e7\u0001\u0000\u0000\u0000\u00ea\u00ed"+
					"\u0001\u0000\u0000\u0000\u00eb\u00e9\u0001\u0000\u0000\u0000\u00eb\u00ec"+
					"\u0001\u0000\u0000\u0000\u00ec\u00f7\u0001\u0000\u0000\u0000\u00ed\u00eb"+
					"\u0001\u0000\u0000\u0000\u00ee\u00f3\u0003(\u0014\u0000\u00ef\u00f0\u0005"+
					"\u0002\u0000\u0000\u00f0\u00f2\u0003(\u0014\u0000\u00f1\u00ef\u0001\u0000"+
					"\u0000\u0000\u00f2\u00f5\u0001\u0000\u0000\u0000\u00f3\u00f1\u0001\u0000"+
					"\u0000\u0000\u00f3\u00f4\u0001\u0000\u0000\u0000\u00f4\u00f7\u0001\u0000"+
					"\u0000\u0000\u00f5\u00f3\u0001\u0000\u0000\u0000\u00f6\u00e6\u0001\u0000"+
					"\u0000\u0000\u00f6\u00ee\u0001\u0000\u0000\u0000\u00f7%\u0001\u0000\u0000"+
					"\u0000\u00f8\u0108\u00050\u0000\u0000\u00f9\u0108\u0005.\u0000\u0000\u00fa"+
					"\u0108\u0005,\u0000\u0000\u00fb\u0108\u0005/\u0000\u0000\u00fc\u0108\u0005"+
					"-\u0000\u0000\u00fd\u0108\u00051\u0000\u0000\u00fe\u0108\u0005\u0014\u0000"+
					"\u0000\u00ff\u0100\u0005\u0004\u0000\u0000\u0100\u0108\u0005\u0014\u0000"+
					"\u0000\u0101\u0108\u0005\u0011\u0000\u0000\u0102\u0103\u0005\u0004\u0000"+
					"\u0000\u0103\u0108\u0005\u0011\u0000\u0000\u0104\u0108\u0005\u0012\u0000"+
					"\u0000\u0105\u0106\u0005\u0004\u0000\u0000\u0106\u0108\u0005\u0012\u0000"+
					"\u0000\u0107\u00f8\u0001\u0000\u0000\u0000\u0107\u00f9\u0001\u0000\u0000"+
					"\u0000\u0107\u00fa\u0001\u0000\u0000\u0000\u0107\u00fb\u0001\u0000\u0000"+
					"\u0000\u0107\u00fc\u0001\u0000\u0000\u0000\u0107\u00fd\u0001\u0000\u0000"+
					"\u0000\u0107\u00fe\u0001\u0000\u0000\u0000\u0107\u00ff\u0001\u0000\u0000"+
					"\u0000\u0107\u0101\u0001\u0000\u0000\u0000\u0107\u0102\u0001\u0000\u0000"+
					"\u0000\u0107\u0104\u0001\u0000\u0000\u0000\u0107\u0105\u0001\u0000\u0000"+
					"\u0000\u0108\'\u0001\u0000\u0000\u0000\u0109\u010a\u0003*\u0015\u0000"+
					"\u010a\u010b\u0003&\u0013\u0000\u010b\u010c\u0003*\u0015\u0000\u010c\u0117"+
					"\u0001\u0000\u0000\u0000\u010d\u010e\u00052\u0000\u0000\u010e\u010f\u0003"+
					"(\u0014\u0000\u010f\u0110\u00053\u0000\u0000\u0110\u0117\u0001\u0000\u0000"+
					"\u0000\u0111\u0112\u0005A\u0000\u0000\u0112\u0113\u0005\u0015\u0000\u0000"+
					"\u0113\u0114\u0005A\u0000\u0000\u0114\u0115\u0005\u0001\u0000\u0000\u0115"+
					"\u0117\u0005A\u0000\u0000\u0116\u0109\u0001\u0000\u0000\u0000\u0116\u010d"+
					"\u0001\u0000\u0000\u0000\u0116\u0111\u0001\u0000\u0000\u0000\u0117)\u0001"+
					"\u0000\u0000\u0000\u0118\u0120\u0003\n\u0005\u0000\u0119\u0120\u0003\f"+
					"\u0006\u0000\u011a\u0120\u0005A\u0000\u0000\u011b\u011c\u0005A\u0000\u0000"+
					"\u011c\u011d\u00059\u0000\u0000\u011d\u0120\u0005A\u0000\u0000\u011e\u0120"+
					"\u0003\u0012\t\u0000\u011f\u0118\u0001\u0000\u0000\u0000\u011f\u0119\u0001"+
					"\u0000\u0000\u0000\u011f\u011a\u0001\u0000\u0000\u0000\u011f\u011b\u0001"+
					"\u0000\u0000\u0000\u011f\u011e\u0001\u0000\u0000\u0000\u0120+\u0001\u0000"+
					"\u0000\u0000\u0121\u0122\u0006\u0016\uffff\uffff\u0000\u0122\u0124\u0003"+
					".\u0017\u0000\u0123\u0125\u00038\u001c\u0000\u0124\u0123\u0001\u0000\u0000"+
					"\u0000\u0124\u0125\u0001\u0000\u0000\u0000\u0125\u0132\u0001\u0000\u0000"+
					"\u0000\u0126\u0127\u0003:\u001d\u0000\u0127\u0128\u00052\u0000\u0000\u0128"+
					"\u012b\u0003,\u0016\u0000\u0129\u012a\u0005\t\u0000\u0000\u012a\u012c"+
					"\u00036\u001b\u0000\u012b\u0129\u0001\u0000\u0000\u0000\u012b\u012c\u0001"+
					"\u0000\u0000\u0000\u012c\u012d\u0001\u0000\u0000\u0000\u012d\u012e\u0005"+
					"3\u0000\u0000\u012e\u0132\u0001\u0000\u0000\u0000\u012f\u0132\u0003\u0004"+
					"\u0002\u0000\u0130\u0132\u0005A\u0000\u0000\u0131\u0121\u0001\u0000\u0000"+
					"\u0000\u0131\u0126\u0001\u0000\u0000\u0000\u0131\u012f\u0001\u0000\u0000"+
					"\u0000\u0131\u0130\u0001\u0000\u0000\u0000\u0132\u0148\u0001\u0000\u0000"+
					"\u0000\u0133\u0134\n\u0006\u0000\u0000\u0134\u0135\u0003<\u001e\u0000"+
					"\u0135\u0136\u0003,\u0016\u0007\u0136\u0147\u0001\u0000\u0000\u0000\u0137"+
					"\u0138\n\u0004\u0000\u0000\u0138\u0139\u00056\u0000\u0000\u0139\u013a"+
					"\u0003\u000e\u0007\u0000\u013a\u013b\u00057\u0000\u0000\u013b\u0147\u0001"+
					"\u0000\u0000\u0000\u013c\u013d\n\u0003\u0000\u0000\u013d\u013e\u00056"+
					"\u0000\u0000\u013e\u013f\u0003\u000e\u0007\u0000\u013f\u0140\u0005:\u0000"+
					"\u0000\u0140\u0141\u0003\u000e\u0007\u0000\u0141\u0142\u00057\u0000\u0000"+
					"\u0142\u0147\u0001\u0000\u0000\u0000\u0143\u0144\n\u0002\u0000\u0000\u0144"+
					"\u0145\u0005\r\u0000\u0000\u0145\u0147\u0003\u000e\u0007\u0000\u0146\u0133"+
					"\u0001\u0000\u0000\u0000\u0146\u0137\u0001\u0000\u0000\u0000\u0146\u013c"+
					"\u0001\u0000\u0000\u0000\u0146\u0143\u0001\u0000\u0000\u0000\u0147\u014a"+
					"\u0001\u0000\u0000\u0000\u0148\u0146\u0001\u0000\u0000\u0000\u0148\u0149"+
					"\u0001\u0000\u0000\u0000\u0149-\u0001\u0000\u0000\u0000\u014a\u0148\u0001"+
					"\u0000\u0000\u0000\u014b\u014d\u00054\u0000\u0000\u014c\u014e\u00030\u0018"+
					"\u0000\u014d\u014c\u0001\u0000\u0000\u0000\u014d\u014e\u0001\u0000\u0000"+
					"\u0000\u014e\u014f\u0001\u0000\u0000\u0000\u014f\u0150\u00055\u0000\u0000"+
					"\u0150/\u0001\u0000\u0000\u0000\u0151\u0156\u00032\u0019\u0000\u0152\u0153"+
					"\u00058\u0000\u0000\u0153\u0155\u00032\u0019\u0000\u0154\u0152\u0001\u0000"+
					"\u0000\u0000\u0155\u0158\u0001\u0000\u0000\u0000\u0156\u0154\u0001\u0000"+
					"\u0000\u0000\u0156\u0157\u0001\u0000\u0000\u0000\u01571\u0001\u0000\u0000"+
					"\u0000\u0158\u0156\u0001\u0000\u0000\u0000\u0159\u015a\u0005A\u0000\u0000"+
					"\u015a\u015b\u00034\u001a\u0000\u015b\u015c\u0003\f\u0006\u0000\u015c"+
					"3\u0001\u0000\u0000\u0000\u015d\u015e\u0007\u0004\u0000\u0000\u015e5\u0001"+
					"\u0000\u0000\u0000\u015f\u0160\u00052\u0000\u0000\u0160\u0165\u0005A\u0000"+
					"\u0000\u0161\u0162\u00058\u0000\u0000\u0162\u0164\u0005A\u0000\u0000\u0163"+
					"\u0161\u0001\u0000\u0000\u0000\u0164\u0167\u0001\u0000\u0000\u0000\u0165"+
					"\u0163\u0001\u0000\u0000\u0000\u0165\u0166\u0001\u0000\u0000\u0000\u0166"+
					"\u0168\u0001\u0000\u0000\u0000\u0167\u0165\u0001\u0000\u0000\u0000\u0168"+
					"\u0169\u00053\u0000\u0000\u01697\u0001\u0000\u0000\u0000\u016a\u016b\u0005"+
					"6\u0000\u0000\u016b\u016c\u0003\u000e\u0007\u0000\u016c\u016d\u00057\u0000"+
					"\u0000\u016d9\u0001\u0000\u0000\u0000\u016e\u016f\u0007\u0005\u0000\u0000"+
					"\u016f;\u0001\u0000\u0000\u0000\u0170\u0171\u0007\u0006\u0000\u0000\u0171"+
					"=\u0001\u0000\u0000\u0000)IWYfm}\u0082\u0086\u008b\u008f\u0096\u009b\u009e"+
					"\u00a2\u00a5\u00a9\u00ac\u00b2\u00b5\u00b7\u00be\u00c6\u00cb\u00d4\u00d9"+
					"\u00dc\u00e4\u00eb\u00f3\u00f6\u0107\u0116\u011f\u0124\u012b\u0131\u0146"+
					"\u0148\u014d\u0156\u0165";
	public static final ATN _ATN =
			new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}