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
    static {
        RuntimeMetaData.checkVersion("4.13.2", RuntimeMetaData.VERSION);
    }

    protected static final DFA[] _decisionToDFA;
    protected static final PredictionContextCache _sharedContextCache = new PredictionContextCache();
    public static final int AND = 1, OR = 2, UNLESS = 3, NOT = 4, SELECT = 5, FROM = 6, WHERE = 7, GROUP = 8, BY = 9, HAVING = 10, ORDER = 11, LIMIT = 12, OFFSET = 13, AS = 14, ASC = 15, DESC = 16, IN = 17, IS = 18, NULL = 19, LIKE = 20, BETWEEN = 21, STAR = 22, COUNT = 23, SUM = 24, AVG = 25, MIN = 26, MAX = 27, STDDEV = 28, STDVAR = 29, VARIANCE = 30, RATE_FUNCTION = 31, INCREASE_FUNCTION = 32, HISTOGRAM_QUANTILE_FUNCTION = 33, TOPK = 34, BOTTOMK = 35, QUANTILE = 36, BY_FUNCTION = 37, WITHOUT_FUNCTION = 38, GROUP_LEFT_FUNCTION = 39, GROUP_RIGHT_FUNCTION = 40, IGNORING_FUNCTION = 41, ON_FUNCTION = 42, SQL_FUNCTION = 43, PROMQL_FUNCTION = 44, GT = 45, GE = 46, LT = 47, LE = 48, EQ = 49, NE = 50, BOOL = 51, LPAREN = 52, RPAREN = 53, LBRACE = 54, RBRACE = 55, LBRACKET = 56, RBRACKET = 57, COMMA = 58, DOT = 59, COLON = 60, SEMICOLON = 61, SCIENTIFIC_NUMBER = 62, FLOAT = 63, NUMBER = 64, DURATION = 65, STRING = 66, IDENTIFIER = 67, WS = 68, LINE_COMMENT = 69, BLOCK_COMMENT = 70;
    public static final int RULE_expression = 0, RULE_expr = 1, RULE_functionCall = 2, RULE_parameterList = 3, RULE_parameter = 4, RULE_number = 5, RULE_string = 6, RULE_duration = 7, RULE_functionName = 8, RULE_selectSql = 9, RULE_selectFieldList = 10, RULE_selectField = 11, RULE_groupByList = 12, RULE_orderByList = 13, RULE_orderByField = 14, RULE_limitClause = 15, RULE_relList = 16, RULE_relation = 17, RULE_conditionList = 18, RULE_compOp = 19, RULE_condition = 20, RULE_conditionUnit = 21, RULE_promql = 22, RULE_metricSelector = 23, RULE_labelMatcherList = 24, RULE_labelMatcherItem = 25, RULE_labelMatcherOp = 26, RULE_labelList = 27, RULE_instantVectorOp = 28, RULE_aggregationOperator = 29;

    private static String[] makeRuleNames() {
        return new String[]{"expression", "expr", "functionCall", "parameterList", "parameter", "number", "string", "duration", "functionName", "selectSql", "selectFieldList", "selectField", "groupByList", "orderByList", "orderByField", "limitClause", "relList", "relation", "conditionList", "compOp", "condition", "conditionUnit", "promql", "metricSelector", "labelMatcherList", "labelMatcherItem", "labelMatcherOp", "labelList", "instantVectorOp", "aggregationOperator"};
    }

    public static final String[] ruleNames = makeRuleNames();

    private static String[] makeLiteralNames() {
        return new String[]{null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "'*'", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "'>'", "'>='", "'<'", "'<='", null, "'!='", "'bool'", "'('", "')'", "'{'", "'}'", "'['", "']'", "','", "'.'", "':'", "';'"};
    }

    private static final String[] _LITERAL_NAMES = makeLiteralNames();

    private static String[] makeSymbolicNames() {
        return new String[]{null, "AND", "OR", "UNLESS", "NOT", "SELECT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "LIMIT", "OFFSET", "AS", "ASC", "DESC", "IN", "IS", "NULL", "LIKE", "BETWEEN", "STAR", "COUNT", "SUM", "AVG", "MIN", "MAX", "STDDEV", "STDVAR", "VARIANCE", "RATE_FUNCTION", "INCREASE_FUNCTION", "HISTOGRAM_QUANTILE_FUNCTION", "TOPK", "BOTTOMK", "QUANTILE", "BY_FUNCTION", "WITHOUT_FUNCTION", "GROUP_LEFT_FUNCTION", "GROUP_RIGHT_FUNCTION", "IGNORING_FUNCTION", "ON_FUNCTION", "SQL_FUNCTION", "PROMQL_FUNCTION", "GT", "GE", "LT", "LE", "EQ", "NE", "BOOL", "LPAREN", "RPAREN", "LBRACE", "RBRACE", "LBRACKET", "RBRACKET", "COMMA", "DOT", "COLON", "SEMICOLON", "SCIENTIFIC_NUMBER", "FLOAT", "NUMBER", "DURATION", "STRING", "IDENTIFIER", "WS", "LINE_COMMENT", "BLOCK_COMMENT"};
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
    public String getGrammarFileName() {
        return "AlertExpression.g4";
    }

    @Override
    public String[] getRuleNames() {
        return ruleNames;
    }

    @Override
    public String getSerializedATN() {
        return _serializedATN;
    }

    @Override
    public ATN getATN() {
        return _ATN;
    }

    public AlertExpressionParser(TokenStream input) {
        super(input);
        _interp = new ParserATNSimulator(this, _ATN, _decisionToDFA, _sharedContextCache);
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ExpressionContext extends ParserRuleContext {
        public ExprContext expr() {
            return getRuleContext(ExprContext.class, 0);
        }

        public TerminalNode EOF() {
            return getToken(AlertExpressionParser.EOF, 0);
        }

        public ExpressionContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_expression;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitExpression(this);
            else return visitor.visitChildren(this);
        }
    }

    public final ExpressionContext expression() throws RecognitionException {
        ExpressionContext _localctx = new ExpressionContext(_ctx, getState());
        enterRule(_localctx, 0, RULE_expression);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(60);
                expr(0);
                setState(61);
                match(EOF);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ExprContext extends ParserRuleContext {
        public ExprContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_expr;
        }

        public ExprContext() {
        }

        public void copyFrom(ExprContext ctx) {
            super.copyFrom(ctx);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class AndExprContext extends ExprContext {
        public ExprContext left;
        public ExprContext right;

        public TerminalNode AND() {
            return getToken(AlertExpressionParser.AND, 0);
        }

        public List<ExprContext> expr() {
            return getRuleContexts(ExprContext.class);
        }

        public ExprContext expr(int i) {
            return getRuleContext(ExprContext.class, i);
        }

        public AndExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitAndExpr(this);
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
            return getRuleContext(ExprContext.class, i);
        }

        public TerminalNode GE() {
            return getToken(AlertExpressionParser.GE, 0);
        }

        public TerminalNode LE() {
            return getToken(AlertExpressionParser.LE, 0);
        }

        public TerminalNode GT() {
            return getToken(AlertExpressionParser.GT, 0);
        }

        public TerminalNode LT() {
            return getToken(AlertExpressionParser.LT, 0);
        }

        public TerminalNode EQ() {
            return getToken(AlertExpressionParser.EQ, 0);
        }

        public TerminalNode NE() {
            return getToken(AlertExpressionParser.NE, 0);
        }

        public TerminalNode BOOL() {
            return getToken(AlertExpressionParser.BOOL, 0);
        }

        public ComparisonExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitComparisonExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class UnlessExprContext extends ExprContext {
        public ExprContext left;
        public ExprContext right;

        public TerminalNode UNLESS() {
            return getToken(AlertExpressionParser.UNLESS, 0);
        }

        public List<ExprContext> expr() {
            return getRuleContexts(ExprContext.class);
        }

        public ExprContext expr(int i) {
            return getRuleContext(ExprContext.class, i);
        }

        public UnlessExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitUnlessExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class SqlExprContext extends ExprContext {
        public SelectSqlContext selectSql() {
            return getRuleContext(SelectSqlContext.class, 0);
        }

        public SqlExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitSqlExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class SqlCallExprContext extends ExprContext {
        public TerminalNode SQL_FUNCTION() {
            return getToken(AlertExpressionParser.SQL_FUNCTION, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public StringContext string() {
            return getRuleContext(StringContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public SqlCallExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitSqlCallExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class LiteralExprContext extends ExprContext {
        public NumberContext number() {
            return getRuleContext(NumberContext.class, 0);
        }

        public LiteralExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitLiteralExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ParenExprContext extends ExprContext {
        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public ExprContext expr() {
            return getRuleContext(ExprContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public ParenExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitParenExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class PromqlCallExprContext extends ExprContext {
        public TerminalNode PROMQL_FUNCTION() {
            return getToken(AlertExpressionParser.PROMQL_FUNCTION, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public StringContext string() {
            return getRuleContext(StringContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public PromqlCallExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitPromqlCallExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class PromqlExprContext extends ExprContext {
        public PromqlContext promql() {
            return getRuleContext(PromqlContext.class, 0);
        }

        public PromqlExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitPromqlExpr(this);
            else return visitor.visitChildren(this);
        }
    }

    @SuppressWarnings("CheckReturnValue")
    public static class OrExprContext extends ExprContext {
        public ExprContext left;
        public ExprContext right;

        public TerminalNode OR() {
            return getToken(AlertExpressionParser.OR, 0);
        }

        public List<ExprContext> expr() {
            return getRuleContexts(ExprContext.class);
        }

        public ExprContext expr(int i) {
            return getRuleContext(ExprContext.class, i);
        }

        public OrExprContext(ExprContext ctx) {
            copyFrom(ctx);
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitOrExpr(this);
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
                setState(81);
                _errHandler.sync(this);
                switch (_input.LA(1)) {
                    case LPAREN: {
                        _localctx = new ParenExprContext(_localctx);
                        _ctx = _localctx;
                        _prevctx = _localctx;

                        setState(64);
                        match(LPAREN);
                        setState(65);
                        expr(0);
                        setState(66);
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
                    case IDENTIFIER: {
                        _localctx = new PromqlExprContext(_localctx);
                        _ctx = _localctx;
                        _prevctx = _localctx;
                        setState(68);
                        promql(0);
                    }
                    break;
                    case SELECT: {
                        _localctx = new SqlExprContext(_localctx);
                        _ctx = _localctx;
                        _prevctx = _localctx;
                        setState(69);
                        selectSql();
                    }
                    break;
                    case SCIENTIFIC_NUMBER:
                    case FLOAT:
                    case NUMBER: {
                        _localctx = new LiteralExprContext(_localctx);
                        _ctx = _localctx;
                        _prevctx = _localctx;
                        setState(70);
                        number();
                    }
                    break;
                    case SQL_FUNCTION: {
                        _localctx = new SqlCallExprContext(_localctx);
                        _ctx = _localctx;
                        _prevctx = _localctx;
                        setState(71);
                        match(SQL_FUNCTION);
                        setState(72);
                        match(LPAREN);
                        setState(73);
                        string();
                        setState(74);
                        match(RPAREN);
                    }
                    break;
                    case PROMQL_FUNCTION: {
                        _localctx = new PromqlCallExprContext(_localctx);
                        _ctx = _localctx;
                        _prevctx = _localctx;
                        setState(76);
                        match(PROMQL_FUNCTION);
                        setState(77);
                        match(LPAREN);
                        setState(78);
                        string();
                        setState(79);
                        match(RPAREN);
                    }
                    break;
                    default:
                        throw new NoViableAltException(this);
                }
                _ctx.stop = _input.LT(-1);
                setState(100);
                _errHandler.sync(this);
                _alt = getInterpreter().adaptivePredict(_input, 3, _ctx);
                while (_alt != 2 && _alt != ATN.INVALID_ALT_NUMBER) {
                    if (_alt == 1) {
                        if (_parseListeners != null) triggerExitRuleEvent();
                        _prevctx = _localctx;
                        {
                            setState(98);
                            _errHandler.sync(this);
                            switch (getInterpreter().adaptivePredict(_input, 2, _ctx)) {
                                case 1: {
                                    _localctx = new ComparisonExprContext(new ExprContext(_parentctx, _parentState));
                                    ((ComparisonExprContext) _localctx).left = _prevctx;
                                    pushNewRecursionContext(_localctx, _startState, RULE_expr);
                                    setState(83);
                                    if (!(precpred(_ctx, 9)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 9)");
                                    setState(84);
                                    ((ComparisonExprContext) _localctx).op = _input.LT(1);
                                    _la = _input.LA(1);
                                    if (!((((_la) & ~0x3f) == 0 && ((1L << _la) & 2216615441596416L) != 0))) {
                                        ((ComparisonExprContext) _localctx).op = (Token) _errHandler.recoverInline(this);
                                    } else {
                                        if (_input.LA(1) == Token.EOF) matchedEOF = true;
                                        _errHandler.reportMatch(this);
                                        consume();
                                    }
                                    setState(86);
                                    _errHandler.sync(this);
                                    _la = _input.LA(1);
                                    if (_la == BOOL) {
                                        {
                                            setState(85);
                                            match(BOOL);
                                        }
                                    }

                                    setState(88);
                                    ((ComparisonExprContext) _localctx).right = expr(10);
                                }
                                break;
                                case 2: {
                                    _localctx = new AndExprContext(new ExprContext(_parentctx, _parentState));
                                    ((AndExprContext) _localctx).left = _prevctx;
                                    pushNewRecursionContext(_localctx, _startState, RULE_expr);
                                    setState(89);
                                    if (!(precpred(_ctx, 8)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 8)");
                                    setState(90);
                                    match(AND);
                                    setState(91);
                                    ((AndExprContext) _localctx).right = expr(9);
                                }
                                break;
                                case 3: {
                                    _localctx = new UnlessExprContext(new ExprContext(_parentctx, _parentState));
                                    ((UnlessExprContext) _localctx).left = _prevctx;
                                    pushNewRecursionContext(_localctx, _startState, RULE_expr);
                                    setState(92);
                                    if (!(precpred(_ctx, 7)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 7)");
                                    setState(93);
                                    match(UNLESS);
                                    setState(94);
                                    ((UnlessExprContext) _localctx).right = expr(8);
                                }
                                break;
                                case 4: {
                                    _localctx = new OrExprContext(new ExprContext(_parentctx, _parentState));
                                    ((OrExprContext) _localctx).left = _prevctx;
                                    pushNewRecursionContext(_localctx, _startState, RULE_expr);
                                    setState(95);
                                    if (!(precpred(_ctx, 6)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 6)");
                                    setState(96);
                                    match(OR);
                                    setState(97);
                                    ((OrExprContext) _localctx).right = expr(7);
                                }
                                break;
                            }
                        }
                    }
                    setState(102);
                    _errHandler.sync(this);
                    _alt = getInterpreter().adaptivePredict(_input, 3, _ctx);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            unrollRecursionContexts(_parentctx);
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class FunctionCallContext extends ParserRuleContext {
        public FunctionNameContext functionName() {
            return getRuleContext(FunctionNameContext.class, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public ParameterListContext parameterList() {
            return getRuleContext(ParameterListContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public FunctionCallContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_functionCall;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitFunctionCall(this);
            else return visitor.visitChildren(this);
        }
    }

    public final FunctionCallContext functionCall() throws RecognitionException {
        FunctionCallContext _localctx = new FunctionCallContext(_ctx, getState());
        enterRule(_localctx, 4, RULE_functionCall);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(103);
                functionName();
                setState(104);
                match(LPAREN);
                setState(105);
                parameterList();
                setState(106);
                match(RPAREN);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
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
            return getRuleContext(ParameterContext.class, i);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public ParameterListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_parameterList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitParameterList(this);
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
                setState(108);
                parameter();
                setState(113);
                _errHandler.sync(this);
                _la = _input.LA(1);
                while (_la == COMMA) {
                    {
                        {
                            setState(109);
                            match(COMMA);
                            setState(110);
                            parameter();
                        }
                    }
                    setState(115);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ParameterContext extends ParserRuleContext {
        public ExprContext expr() {
            return getRuleContext(ExprContext.class, 0);
        }

        public TerminalNode STAR() {
            return getToken(AlertExpressionParser.STAR, 0);
        }

        public StringContext string() {
            return getRuleContext(StringContext.class, 0);
        }

        public DurationContext duration() {
            return getRuleContext(DurationContext.class, 0);
        }

        public ParameterContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_parameter;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitParameter(this);
            else return visitor.visitChildren(this);
        }
    }

    public final ParameterContext parameter() throws RecognitionException {
        ParameterContext _localctx = new ParameterContext(_ctx, getState());
        enterRule(_localctx, 8, RULE_parameter);
        try {
            setState(120);
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
                case SQL_FUNCTION:
                case PROMQL_FUNCTION:
                case LPAREN:
                case LBRACE:
                case SCIENTIFIC_NUMBER:
                case FLOAT:
                case NUMBER:
                case IDENTIFIER:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(116);
                    expr(0);
                }
                break;
                case STAR:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(117);
                    match(STAR);
                }
                break;
                case STRING:
                    enterOuterAlt(_localctx, 3);
                {
                    setState(118);
                    string();
                }
                break;
                case DURATION:
                    enterOuterAlt(_localctx, 4);
                {
                    setState(119);
                    duration();
                }
                break;
                default:
                    throw new NoViableAltException(this);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class NumberContext extends ParserRuleContext {
        public TerminalNode NUMBER() {
            return getToken(AlertExpressionParser.NUMBER, 0);
        }

        public TerminalNode FLOAT() {
            return getToken(AlertExpressionParser.FLOAT, 0);
        }

        public TerminalNode SCIENTIFIC_NUMBER() {
            return getToken(AlertExpressionParser.SCIENTIFIC_NUMBER, 0);
        }

        public NumberContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_number;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitNumber(this);
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
                setState(122);
                _la = _input.LA(1);
                if (!(((((_la - 62)) & ~0x3f) == 0 && ((1L << (_la - 62)) & 7L) != 0))) {
                    _errHandler.recoverInline(this);
                } else {
                    if (_input.LA(1) == Token.EOF) matchedEOF = true;
                    _errHandler.reportMatch(this);
                    consume();
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class StringContext extends ParserRuleContext {
        public TerminalNode STRING() {
            return getToken(AlertExpressionParser.STRING, 0);
        }

        public StringContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_string;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitString(this);
            else return visitor.visitChildren(this);
        }
    }

    public final StringContext string() throws RecognitionException {
        StringContext _localctx = new StringContext(_ctx, getState());
        enterRule(_localctx, 12, RULE_string);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(124);
                match(STRING);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class DurationContext extends ParserRuleContext {
        public TerminalNode DURATION() {
            return getToken(AlertExpressionParser.DURATION, 0);
        }

        public DurationContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_duration;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitDuration(this);
            else return visitor.visitChildren(this);
        }
    }

    public final DurationContext duration() throws RecognitionException {
        DurationContext _localctx = new DurationContext(_ctx, getState());
        enterRule(_localctx, 14, RULE_duration);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(126);
                match(DURATION);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class FunctionNameContext extends ParserRuleContext {
        public TerminalNode COUNT() {
            return getToken(AlertExpressionParser.COUNT, 0);
        }

        public TerminalNode AVG() {
            return getToken(AlertExpressionParser.AVG, 0);
        }

        public TerminalNode SUM() {
            return getToken(AlertExpressionParser.SUM, 0);
        }

        public TerminalNode MIN() {
            return getToken(AlertExpressionParser.MIN, 0);
        }

        public TerminalNode MAX() {
            return getToken(AlertExpressionParser.MAX, 0);
        }

        public TerminalNode RATE_FUNCTION() {
            return getToken(AlertExpressionParser.RATE_FUNCTION, 0);
        }

        public TerminalNode INCREASE_FUNCTION() {
            return getToken(AlertExpressionParser.INCREASE_FUNCTION, 0);
        }

        public TerminalNode HISTOGRAM_QUANTILE_FUNCTION() {
            return getToken(AlertExpressionParser.HISTOGRAM_QUANTILE_FUNCTION, 0);
        }

        public TerminalNode BY_FUNCTION() {
            return getToken(AlertExpressionParser.BY_FUNCTION, 0);
        }

        public TerminalNode WITHOUT_FUNCTION() {
            return getToken(AlertExpressionParser.WITHOUT_FUNCTION, 0);
        }

        public TerminalNode GROUP_LEFT_FUNCTION() {
            return getToken(AlertExpressionParser.GROUP_LEFT_FUNCTION, 0);
        }

        public TerminalNode GROUP_RIGHT_FUNCTION() {
            return getToken(AlertExpressionParser.GROUP_RIGHT_FUNCTION, 0);
        }

        public TerminalNode IGNORING_FUNCTION() {
            return getToken(AlertExpressionParser.IGNORING_FUNCTION, 0);
        }

        public TerminalNode ON_FUNCTION() {
            return getToken(AlertExpressionParser.ON_FUNCTION, 0);
        }

        public TerminalNode IDENTIFIER() {
            return getToken(AlertExpressionParser.IDENTIFIER, 0);
        }

        public FunctionNameContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_functionName;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitFunctionName(this);
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
                setState(128);
                _la = _input.LA(1);
                if (!(((((_la - 23)) & ~0x3f) == 0 && ((1L << (_la - 23)) & 17592187078431L) != 0))) {
                    _errHandler.recoverInline(this);
                } else {
                    if (_input.LA(1) == Token.EOF) matchedEOF = true;
                    _errHandler.reportMatch(this);
                    consume();
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class SelectSqlContext extends ParserRuleContext {
        public TerminalNode SELECT() {
            return getToken(AlertExpressionParser.SELECT, 0);
        }

        public SelectFieldListContext selectFieldList() {
            return getRuleContext(SelectFieldListContext.class, 0);
        }

        public TerminalNode FROM() {
            return getToken(AlertExpressionParser.FROM, 0);
        }

        public RelListContext relList() {
            return getRuleContext(RelListContext.class, 0);
        }

        public TerminalNode WHERE() {
            return getToken(AlertExpressionParser.WHERE, 0);
        }

        public List<ConditionListContext> conditionList() {
            return getRuleContexts(ConditionListContext.class);
        }

        public ConditionListContext conditionList(int i) {
            return getRuleContext(ConditionListContext.class, i);
        }

        public TerminalNode GROUP() {
            return getToken(AlertExpressionParser.GROUP, 0);
        }

        public List<TerminalNode> BY() {
            return getTokens(AlertExpressionParser.BY);
        }

        public TerminalNode BY(int i) {
            return getToken(AlertExpressionParser.BY, i);
        }

        public GroupByListContext groupByList() {
            return getRuleContext(GroupByListContext.class, 0);
        }

        public TerminalNode HAVING() {
            return getToken(AlertExpressionParser.HAVING, 0);
        }

        public TerminalNode ORDER() {
            return getToken(AlertExpressionParser.ORDER, 0);
        }

        public OrderByListContext orderByList() {
            return getRuleContext(OrderByListContext.class, 0);
        }

        public TerminalNode LIMIT() {
            return getToken(AlertExpressionParser.LIMIT, 0);
        }

        public LimitClauseContext limitClause() {
            return getRuleContext(LimitClauseContext.class, 0);
        }

        public SelectSqlContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_selectSql;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitSelectSql(this);
            else return visitor.visitChildren(this);
        }
    }

    public final SelectSqlContext selectSql() throws RecognitionException {
        SelectSqlContext _localctx = new SelectSqlContext(_ctx, getState());
        enterRule(_localctx, 18, RULE_selectSql);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(130);
                match(SELECT);
                setState(131);
                selectFieldList();
                setState(132);
                match(FROM);
                setState(133);
                relList();
                setState(136);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 6, _ctx)) {
                    case 1: {
                        setState(134);
                        match(WHERE);
                        setState(135);
                        conditionList(0);
                    }
                    break;
                }
                setState(141);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 7, _ctx)) {
                    case 1: {
                        setState(138);
                        match(GROUP);
                        setState(139);
                        match(BY);
                        setState(140);
                        groupByList();
                    }
                    break;
                }
                setState(145);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 8, _ctx)) {
                    case 1: {
                        setState(143);
                        match(HAVING);
                        setState(144);
                        conditionList(0);
                    }
                    break;
                }
                setState(150);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 9, _ctx)) {
                    case 1: {
                        setState(147);
                        match(ORDER);
                        setState(148);
                        match(BY);
                        setState(149);
                        orderByList();
                    }
                    break;
                }
                setState(154);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 10, _ctx)) {
                    case 1: {
                        setState(152);
                        match(LIMIT);
                        setState(153);
                        limitClause();
                    }
                    break;
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
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
            return getRuleContext(SelectFieldContext.class, i);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public SelectFieldListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_selectFieldList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitSelectFieldList(this);
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
                setState(156);
                selectField();
                setState(161);
                _errHandler.sync(this);
                _la = _input.LA(1);
                while (_la == COMMA) {
                    {
                        {
                            setState(157);
                            match(COMMA);
                            setState(158);
                            selectField();
                        }
                    }
                    setState(163);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class SelectFieldContext extends ParserRuleContext {
        public FunctionCallContext functionCall() {
            return getRuleContext(FunctionCallContext.class, 0);
        }

        public List<TerminalNode> IDENTIFIER() {
            return getTokens(AlertExpressionParser.IDENTIFIER);
        }

        public TerminalNode IDENTIFIER(int i) {
            return getToken(AlertExpressionParser.IDENTIFIER, i);
        }

        public TerminalNode AS() {
            return getToken(AlertExpressionParser.AS, 0);
        }

        public TerminalNode STAR() {
            return getToken(AlertExpressionParser.STAR, 0);
        }

        public TerminalNode DOT() {
            return getToken(AlertExpressionParser.DOT, 0);
        }

        public SelectFieldContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_selectField;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitSelectField(this);
            else return visitor.visitChildren(this);
        }
    }

    public final SelectFieldContext selectField() throws RecognitionException {
        SelectFieldContext _localctx = new SelectFieldContext(_ctx, getState());
        enterRule(_localctx, 22, RULE_selectField);
        int _la;
        try {
            setState(194);
            _errHandler.sync(this);
            switch (getInterpreter().adaptivePredict(_input, 20, _ctx)) {
                case 1:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(164);
                    functionCall();
                    setState(169);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                    if (_la == AS || _la == IDENTIFIER) {
                        {
                            setState(166);
                            _errHandler.sync(this);
                            _la = _input.LA(1);
                            if (_la == AS) {
                                {
                                    setState(165);
                                    match(AS);
                                }
                            }

                            setState(168);
                            match(IDENTIFIER);
                        }
                    }

                }
                break;
                case 2:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(171);
                    match(IDENTIFIER);
                    setState(176);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                    if (_la == AS || _la == IDENTIFIER) {
                        {
                            setState(173);
                            _errHandler.sync(this);
                            _la = _input.LA(1);
                            if (_la == AS) {
                                {
                                    setState(172);
                                    match(AS);
                                }
                            }

                            setState(175);
                            match(IDENTIFIER);
                        }
                    }

                }
                break;
                case 3:
                    enterOuterAlt(_localctx, 3);
                {
                    setState(178);
                    match(STAR);
                    setState(183);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                    if (_la == AS || _la == IDENTIFIER) {
                        {
                            setState(180);
                            _errHandler.sync(this);
                            _la = _input.LA(1);
                            if (_la == AS) {
                                {
                                    setState(179);
                                    match(AS);
                                }
                            }

                            setState(182);
                            match(IDENTIFIER);
                        }
                    }

                }
                break;
                case 4:
                    enterOuterAlt(_localctx, 4);
                {
                    setState(185);
                    match(IDENTIFIER);
                    setState(186);
                    match(DOT);
                    setState(187);
                    match(IDENTIFIER);
                    setState(192);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                    if (_la == AS || _la == IDENTIFIER) {
                        {
                            setState(189);
                            _errHandler.sync(this);
                            _la = _input.LA(1);
                            if (_la == AS) {
                                {
                                    setState(188);
                                    match(AS);
                                }
                            }

                            setState(191);
                            match(IDENTIFIER);
                        }
                    }

                }
                break;
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class GroupByListContext extends ParserRuleContext {
        public List<TerminalNode> IDENTIFIER() {
            return getTokens(AlertExpressionParser.IDENTIFIER);
        }

        public TerminalNode IDENTIFIER(int i) {
            return getToken(AlertExpressionParser.IDENTIFIER, i);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public GroupByListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_groupByList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitGroupByList(this);
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
                setState(196);
                match(IDENTIFIER);
                setState(201);
                _errHandler.sync(this);
                _alt = getInterpreter().adaptivePredict(_input, 21, _ctx);
                while (_alt != 2 && _alt != ATN.INVALID_ALT_NUMBER) {
                    if (_alt == 1) {
                        {
                            {
                                setState(197);
                                match(COMMA);
                                setState(198);
                                match(IDENTIFIER);
                            }
                        }
                    }
                    setState(203);
                    _errHandler.sync(this);
                    _alt = getInterpreter().adaptivePredict(_input, 21, _ctx);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
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
            return getRuleContext(OrderByFieldContext.class, i);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public OrderByListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_orderByList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitOrderByList(this);
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
                setState(204);
                orderByField();
                setState(209);
                _errHandler.sync(this);
                _alt = getInterpreter().adaptivePredict(_input, 22, _ctx);
                while (_alt != 2 && _alt != ATN.INVALID_ALT_NUMBER) {
                    if (_alt == 1) {
                        {
                            {
                                setState(205);
                                match(COMMA);
                                setState(206);
                                orderByField();
                            }
                        }
                    }
                    setState(211);
                    _errHandler.sync(this);
                    _alt = getInterpreter().adaptivePredict(_input, 22, _ctx);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class OrderByFieldContext extends ParserRuleContext {
        public TerminalNode IDENTIFIER() {
            return getToken(AlertExpressionParser.IDENTIFIER, 0);
        }

        public TerminalNode ASC() {
            return getToken(AlertExpressionParser.ASC, 0);
        }

        public TerminalNode DESC() {
            return getToken(AlertExpressionParser.DESC, 0);
        }

        public FunctionCallContext functionCall() {
            return getRuleContext(FunctionCallContext.class, 0);
        }

        public OrderByFieldContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_orderByField;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitOrderByField(this);
            else return visitor.visitChildren(this);
        }
    }

    public final OrderByFieldContext orderByField() throws RecognitionException {
        OrderByFieldContext _localctx = new OrderByFieldContext(_ctx, getState());
        enterRule(_localctx, 28, RULE_orderByField);
        int _la;
        try {
            setState(220);
            _errHandler.sync(this);
            switch (getInterpreter().adaptivePredict(_input, 25, _ctx)) {
                case 1:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(212);
                    match(IDENTIFIER);
                    setState(214);
                    _errHandler.sync(this);
                    switch (getInterpreter().adaptivePredict(_input, 23, _ctx)) {
                        case 1: {
                            setState(213);
                            _la = _input.LA(1);
                            if (!(_la == ASC || _la == DESC)) {
                                _errHandler.recoverInline(this);
                            } else {
                                if (_input.LA(1) == Token.EOF) matchedEOF = true;
                                _errHandler.reportMatch(this);
                                consume();
                            }
                        }
                        break;
                    }
                }
                break;
                case 2:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(216);
                    functionCall();
                    setState(218);
                    _errHandler.sync(this);
                    switch (getInterpreter().adaptivePredict(_input, 24, _ctx)) {
                        case 1: {
                            setState(217);
                            _la = _input.LA(1);
                            if (!(_la == ASC || _la == DESC)) {
                                _errHandler.recoverInline(this);
                            } else {
                                if (_input.LA(1) == Token.EOF) matchedEOF = true;
                                _errHandler.reportMatch(this);
                                consume();
                            }
                        }
                        break;
                    }
                }
                break;
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class LimitClauseContext extends ParserRuleContext {
        public TerminalNode NUMBER() {
            return getToken(AlertExpressionParser.NUMBER, 0);
        }

        public LimitClauseContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_limitClause;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitLimitClause(this);
            else return visitor.visitChildren(this);
        }
    }

    public final LimitClauseContext limitClause() throws RecognitionException {
        LimitClauseContext _localctx = new LimitClauseContext(_ctx, getState());
        enterRule(_localctx, 30, RULE_limitClause);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(222);
                match(NUMBER);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
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
            return getRuleContext(RelationContext.class, i);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public RelListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_relList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitRelList(this);
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
                setState(224);
                relation();
                setState(229);
                _errHandler.sync(this);
                _alt = getInterpreter().adaptivePredict(_input, 26, _ctx);
                while (_alt != 2 && _alt != ATN.INVALID_ALT_NUMBER) {
                    if (_alt == 1) {
                        {
                            {
                                setState(225);
                                match(COMMA);
                                setState(226);
                                relation();
                            }
                        }
                    }
                    setState(231);
                    _errHandler.sync(this);
                    _alt = getInterpreter().adaptivePredict(_input, 26, _ctx);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class RelationContext extends ParserRuleContext {
        public List<TerminalNode> IDENTIFIER() {
            return getTokens(AlertExpressionParser.IDENTIFIER);
        }

        public TerminalNode IDENTIFIER(int i) {
            return getToken(AlertExpressionParser.IDENTIFIER, i);
        }

        public TerminalNode AS() {
            return getToken(AlertExpressionParser.AS, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public SelectSqlContext selectSql() {
            return getRuleContext(SelectSqlContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public RelationContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_relation;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitRelation(this);
            else return visitor.visitChildren(this);
        }
    }

    public final RelationContext relation() throws RecognitionException {
        RelationContext _localctx = new RelationContext(_ctx, getState());
        enterRule(_localctx, 34, RULE_relation);
        int _la;
        try {
            setState(245);
            _errHandler.sync(this);
            switch (_input.LA(1)) {
                case IDENTIFIER:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(232);
                    match(IDENTIFIER);
                    setState(237);
                    _errHandler.sync(this);
                    switch (getInterpreter().adaptivePredict(_input, 28, _ctx)) {
                        case 1: {
                            setState(234);
                            _errHandler.sync(this);
                            _la = _input.LA(1);
                            if (_la == AS) {
                                {
                                    setState(233);
                                    match(AS);
                                }
                            }

                            setState(236);
                            match(IDENTIFIER);
                        }
                        break;
                    }
                }
                break;
                case LPAREN:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(239);
                    match(LPAREN);
                    setState(240);
                    selectSql();
                    setState(241);
                    match(RPAREN);
                    setState(242);
                    match(AS);
                    setState(243);
                    match(IDENTIFIER);
                }
                break;
                default:
                    throw new NoViableAltException(this);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ConditionListContext extends ParserRuleContext {
        public ConditionContext condition() {
            return getRuleContext(ConditionContext.class, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public List<ConditionListContext> conditionList() {
            return getRuleContexts(ConditionListContext.class);
        }

        public ConditionListContext conditionList(int i) {
            return getRuleContext(ConditionListContext.class, i);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public TerminalNode AND() {
            return getToken(AlertExpressionParser.AND, 0);
        }

        public TerminalNode OR() {
            return getToken(AlertExpressionParser.OR, 0);
        }

        public ConditionListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_conditionList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitConditionList(this);
            else return visitor.visitChildren(this);
        }
    }

    public final ConditionListContext conditionList() throws RecognitionException {
        return conditionList(0);
    }

    private ConditionListContext conditionList(int _p) throws RecognitionException {
        ParserRuleContext _parentctx = _ctx;
        int _parentState = getState();
        ConditionListContext _localctx = new ConditionListContext(_ctx, _parentState);
        ConditionListContext _prevctx = _localctx;
        int _startState = 36;
        enterRecursionRule(_localctx, 36, RULE_conditionList, _p);
        try {
            int _alt;
            enterOuterAlt(_localctx, 1);
            {
                setState(253);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 30, _ctx)) {
                    case 1: {
                        setState(248);
                        condition();
                    }
                    break;
                    case 2: {
                        setState(249);
                        match(LPAREN);
                        setState(250);
                        conditionList(0);
                        setState(251);
                        match(RPAREN);
                    }
                    break;
                }
                _ctx.stop = _input.LT(-1);
                setState(263);
                _errHandler.sync(this);
                _alt = getInterpreter().adaptivePredict(_input, 32, _ctx);
                while (_alt != 2 && _alt != ATN.INVALID_ALT_NUMBER) {
                    if (_alt == 1) {
                        if (_parseListeners != null) triggerExitRuleEvent();
                        _prevctx = _localctx;
                        {
                            setState(261);
                            _errHandler.sync(this);
                            switch (getInterpreter().adaptivePredict(_input, 31, _ctx)) {
                                case 1: {
                                    _localctx = new ConditionListContext(_parentctx, _parentState);
                                    pushNewRecursionContext(_localctx, _startState, RULE_conditionList);
                                    setState(255);
                                    if (!(precpred(_ctx, 4)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 4)");
                                    setState(256);
                                    match(AND);
                                    setState(257);
                                    conditionList(5);
                                }
                                break;
                                case 2: {
                                    _localctx = new ConditionListContext(_parentctx, _parentState);
                                    pushNewRecursionContext(_localctx, _startState, RULE_conditionList);
                                    setState(258);
                                    if (!(precpred(_ctx, 3)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 3)");
                                    setState(259);
                                    match(OR);
                                    setState(260);
                                    conditionList(4);
                                }
                                break;
                            }
                        }
                    }
                    setState(265);
                    _errHandler.sync(this);
                    _alt = getInterpreter().adaptivePredict(_input, 32, _ctx);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            unrollRecursionContexts(_parentctx);
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class CompOpContext extends ParserRuleContext {
        public TerminalNode EQ() {
            return getToken(AlertExpressionParser.EQ, 0);
        }

        public TerminalNode LT() {
            return getToken(AlertExpressionParser.LT, 0);
        }

        public TerminalNode GT() {
            return getToken(AlertExpressionParser.GT, 0);
        }

        public TerminalNode LE() {
            return getToken(AlertExpressionParser.LE, 0);
        }

        public TerminalNode GE() {
            return getToken(AlertExpressionParser.GE, 0);
        }

        public TerminalNode NE() {
            return getToken(AlertExpressionParser.NE, 0);
        }

        public TerminalNode LIKE() {
            return getToken(AlertExpressionParser.LIKE, 0);
        }

        public TerminalNode NOT() {
            return getToken(AlertExpressionParser.NOT, 0);
        }

        public TerminalNode IN() {
            return getToken(AlertExpressionParser.IN, 0);
        }

        public TerminalNode IS() {
            return getToken(AlertExpressionParser.IS, 0);
        }

        public CompOpContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_compOp;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitCompOp(this);
            else return visitor.visitChildren(this);
        }
    }

    public final CompOpContext compOp() throws RecognitionException {
        CompOpContext _localctx = new CompOpContext(_ctx, getState());
        enterRule(_localctx, 38, RULE_compOp);
        try {
            setState(281);
            _errHandler.sync(this);
            switch (getInterpreter().adaptivePredict(_input, 33, _ctx)) {
                case 1:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(266);
                    match(EQ);
                }
                break;
                case 2:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(267);
                    match(LT);
                }
                break;
                case 3:
                    enterOuterAlt(_localctx, 3);
                {
                    setState(268);
                    match(GT);
                }
                break;
                case 4:
                    enterOuterAlt(_localctx, 4);
                {
                    setState(269);
                    match(LE);
                }
                break;
                case 5:
                    enterOuterAlt(_localctx, 5);
                {
                    setState(270);
                    match(GE);
                }
                break;
                case 6:
                    enterOuterAlt(_localctx, 6);
                {
                    setState(271);
                    match(NE);
                }
                break;
                case 7:
                    enterOuterAlt(_localctx, 7);
                {
                    setState(272);
                    match(LIKE);
                }
                break;
                case 8:
                    enterOuterAlt(_localctx, 8);
                {
                    setState(273);
                    match(NOT);
                    setState(274);
                    match(LIKE);
                }
                break;
                case 9:
                    enterOuterAlt(_localctx, 9);
                {
                    setState(275);
                    match(IN);
                }
                break;
                case 10:
                    enterOuterAlt(_localctx, 10);
                {
                    setState(276);
                    match(NOT);
                    setState(277);
                    match(IN);
                }
                break;
                case 11:
                    enterOuterAlt(_localctx, 11);
                {
                    setState(278);
                    match(IS);
                }
                break;
                case 12:
                    enterOuterAlt(_localctx, 12);
                {
                    setState(279);
                    match(IS);
                    setState(280);
                    match(NOT);
                }
                break;
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ConditionContext extends ParserRuleContext {
        public List<ConditionUnitContext> conditionUnit() {
            return getRuleContexts(ConditionUnitContext.class);
        }

        public ConditionUnitContext conditionUnit(int i) {
            return getRuleContext(ConditionUnitContext.class, i);
        }

        public CompOpContext compOp() {
            return getRuleContext(CompOpContext.class, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public ConditionContext condition() {
            return getRuleContext(ConditionContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public TerminalNode IDENTIFIER() {
            return getToken(AlertExpressionParser.IDENTIFIER, 0);
        }

        public TerminalNode BETWEEN() {
            return getToken(AlertExpressionParser.BETWEEN, 0);
        }

        public List<NumberContext> number() {
            return getRuleContexts(NumberContext.class);
        }

        public NumberContext number(int i) {
            return getRuleContext(NumberContext.class, i);
        }

        public TerminalNode AND() {
            return getToken(AlertExpressionParser.AND, 0);
        }

        public ConditionContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_condition;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitCondition(this);
            else return visitor.visitChildren(this);
        }
    }

    public final ConditionContext condition() throws RecognitionException {
        ConditionContext _localctx = new ConditionContext(_ctx, getState());
        enterRule(_localctx, 40, RULE_condition);
        try {
            setState(297);
            _errHandler.sync(this);
            switch (getInterpreter().adaptivePredict(_input, 34, _ctx)) {
                case 1:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(283);
                    conditionUnit();
                    setState(284);
                    compOp();
                    setState(285);
                    conditionUnit();
                }
                break;
                case 2:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(287);
                    match(LPAREN);
                    setState(288);
                    condition();
                    setState(289);
                    match(RPAREN);
                }
                break;
                case 3:
                    enterOuterAlt(_localctx, 3);
                {
                    setState(291);
                    match(IDENTIFIER);
                    setState(292);
                    match(BETWEEN);
                    setState(293);
                    number();
                    setState(294);
                    match(AND);
                    setState(295);
                    number();
                }
                break;
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class ConditionUnitContext extends ParserRuleContext {
        public NumberContext number() {
            return getRuleContext(NumberContext.class, 0);
        }

        public StringContext string() {
            return getRuleContext(StringContext.class, 0);
        }

        public List<TerminalNode> IDENTIFIER() {
            return getTokens(AlertExpressionParser.IDENTIFIER);
        }

        public TerminalNode IDENTIFIER(int i) {
            return getToken(AlertExpressionParser.IDENTIFIER, i);
        }

        public TerminalNode DOT() {
            return getToken(AlertExpressionParser.DOT, 0);
        }

        public TerminalNode NULL() {
            return getToken(AlertExpressionParser.NULL, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public SelectSqlContext selectSql() {
            return getRuleContext(SelectSqlContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public FunctionCallContext functionCall() {
            return getRuleContext(FunctionCallContext.class, 0);
        }

        public ConditionUnitContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_conditionUnit;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitConditionUnit(this);
            else return visitor.visitChildren(this);
        }
    }

    public final ConditionUnitContext conditionUnit() throws RecognitionException {
        ConditionUnitContext _localctx = new ConditionUnitContext(_ctx, getState());
        enterRule(_localctx, 42, RULE_conditionUnit);
        try {
            setState(311);
            _errHandler.sync(this);
            switch (getInterpreter().adaptivePredict(_input, 35, _ctx)) {
                case 1:
                    enterOuterAlt(_localctx, 1);
                {
                    setState(299);
                    number();
                }
                break;
                case 2:
                    enterOuterAlt(_localctx, 2);
                {
                    setState(300);
                    string();
                }
                break;
                case 3:
                    enterOuterAlt(_localctx, 3);
                {
                    setState(301);
                    match(IDENTIFIER);
                }
                break;
                case 4:
                    enterOuterAlt(_localctx, 4);
                {
                    setState(302);
                    match(IDENTIFIER);
                    setState(303);
                    match(DOT);
                    setState(304);
                    match(IDENTIFIER);
                }
                break;
                case 5:
                    enterOuterAlt(_localctx, 5);
                {
                    setState(305);
                    match(NULL);
                }
                break;
                case 6:
                    enterOuterAlt(_localctx, 6);
                {
                    setState(306);
                    match(LPAREN);
                    setState(307);
                    selectSql();
                    setState(308);
                    match(RPAREN);
                }
                break;
                case 7:
                    enterOuterAlt(_localctx, 7);
                {
                    setState(310);
                    functionCall();
                }
                break;
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class PromqlContext extends ParserRuleContext {
        public MetricSelectorContext metricSelector() {
            return getRuleContext(MetricSelectorContext.class, 0);
        }

        public InstantVectorOpContext instantVectorOp() {
            return getRuleContext(InstantVectorOpContext.class, 0);
        }

        public AggregationOperatorContext aggregationOperator() {
            return getRuleContext(AggregationOperatorContext.class, 0);
        }

        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public PromqlContext promql() {
            return getRuleContext(PromqlContext.class, 0);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public TerminalNode BY() {
            return getToken(AlertExpressionParser.BY, 0);
        }

        public LabelListContext labelList() {
            return getRuleContext(LabelListContext.class, 0);
        }

        public FunctionCallContext functionCall() {
            return getRuleContext(FunctionCallContext.class, 0);
        }

        public TerminalNode IDENTIFIER() {
            return getToken(AlertExpressionParser.IDENTIFIER, 0);
        }

        public TerminalNode LBRACKET() {
            return getToken(AlertExpressionParser.LBRACKET, 0);
        }

        public List<DurationContext> duration() {
            return getRuleContexts(DurationContext.class);
        }

        public DurationContext duration(int i) {
            return getRuleContext(DurationContext.class, i);
        }

        public TerminalNode RBRACKET() {
            return getToken(AlertExpressionParser.RBRACKET, 0);
        }

        public TerminalNode COLON() {
            return getToken(AlertExpressionParser.COLON, 0);
        }

        public TerminalNode OFFSET() {
            return getToken(AlertExpressionParser.OFFSET, 0);
        }

        public PromqlContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_promql;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitPromql(this);
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
                setState(329);
                _errHandler.sync(this);
                switch (getInterpreter().adaptivePredict(_input, 38, _ctx)) {
                    case 1: {
                        setState(314);
                        metricSelector();
                        setState(316);
                        _errHandler.sync(this);
                        switch (getInterpreter().adaptivePredict(_input, 36, _ctx)) {
                            case 1: {
                                setState(315);
                                instantVectorOp();
                            }
                            break;
                        }
                    }
                    break;
                    case 2: {
                        setState(318);
                        aggregationOperator();
                        setState(319);
                        match(LPAREN);
                        setState(320);
                        promql(0);
                        setState(323);
                        _errHandler.sync(this);
                        _la = _input.LA(1);
                        if (_la == BY) {
                            {
                                setState(321);
                                match(BY);
                                setState(322);
                                labelList();
                            }
                        }

                        setState(325);
                        match(RPAREN);
                    }
                    break;
                    case 3: {
                        setState(327);
                        functionCall();
                    }
                    break;
                    case 4: {
                        setState(328);
                        match(IDENTIFIER);
                    }
                    break;
                }
                _ctx.stop = _input.LT(-1);
                setState(348);
                _errHandler.sync(this);
                _alt = getInterpreter().adaptivePredict(_input, 40, _ctx);
                while (_alt != 2 && _alt != ATN.INVALID_ALT_NUMBER) {
                    if (_alt == 1) {
                        if (_parseListeners != null) triggerExitRuleEvent();
                        _prevctx = _localctx;
                        {
                            setState(346);
                            _errHandler.sync(this);
                            switch (getInterpreter().adaptivePredict(_input, 39, _ctx)) {
                                case 1: {
                                    _localctx = new PromqlContext(_parentctx, _parentState);
                                    pushNewRecursionContext(_localctx, _startState, RULE_promql);
                                    setState(331);
                                    if (!(precpred(_ctx, 4)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 4)");
                                    setState(332);
                                    match(LBRACKET);
                                    setState(333);
                                    duration();
                                    setState(334);
                                    match(RBRACKET);
                                }
                                break;
                                case 2: {
                                    _localctx = new PromqlContext(_parentctx, _parentState);
                                    pushNewRecursionContext(_localctx, _startState, RULE_promql);
                                    setState(336);
                                    if (!(precpred(_ctx, 3)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 3)");
                                    setState(337);
                                    match(LBRACKET);
                                    setState(338);
                                    duration();
                                    setState(339);
                                    match(COLON);
                                    setState(340);
                                    duration();
                                    setState(341);
                                    match(RBRACKET);
                                }
                                break;
                                case 3: {
                                    _localctx = new PromqlContext(_parentctx, _parentState);
                                    pushNewRecursionContext(_localctx, _startState, RULE_promql);
                                    setState(343);
                                    if (!(precpred(_ctx, 2)))
                                        throw new FailedPredicateException(this, "precpred(_ctx, 2)");
                                    setState(344);
                                    match(OFFSET);
                                    setState(345);
                                    duration();
                                }
                                break;
                            }
                        }
                    }
                    setState(350);
                    _errHandler.sync(this);
                    _alt = getInterpreter().adaptivePredict(_input, 40, _ctx);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            unrollRecursionContexts(_parentctx);
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class MetricSelectorContext extends ParserRuleContext {
        public TerminalNode LBRACE() {
            return getToken(AlertExpressionParser.LBRACE, 0);
        }

        public TerminalNode RBRACE() {
            return getToken(AlertExpressionParser.RBRACE, 0);
        }

        public LabelMatcherListContext labelMatcherList() {
            return getRuleContext(LabelMatcherListContext.class, 0);
        }

        public MetricSelectorContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_metricSelector;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitMetricSelector(this);
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
                setState(351);
                match(LBRACE);
                setState(353);
                _errHandler.sync(this);
                _la = _input.LA(1);
                if (_la == IDENTIFIER) {
                    {
                        setState(352);
                        labelMatcherList();
                    }
                }

                setState(355);
                match(RBRACE);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
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
            return getRuleContext(LabelMatcherItemContext.class, i);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public LabelMatcherListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_labelMatcherList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitLabelMatcherList(this);
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
                setState(357);
                labelMatcherItem();
                setState(362);
                _errHandler.sync(this);
                _la = _input.LA(1);
                while (_la == COMMA) {
                    {
                        {
                            setState(358);
                            match(COMMA);
                            setState(359);
                            labelMatcherItem();
                        }
                    }
                    setState(364);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class LabelMatcherItemContext extends ParserRuleContext {
        public TerminalNode IDENTIFIER() {
            return getToken(AlertExpressionParser.IDENTIFIER, 0);
        }

        public LabelMatcherOpContext labelMatcherOp() {
            return getRuleContext(LabelMatcherOpContext.class, 0);
        }

        public StringContext string() {
            return getRuleContext(StringContext.class, 0);
        }

        public LabelMatcherItemContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_labelMatcherItem;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitLabelMatcherItem(this);
            else return visitor.visitChildren(this);
        }
    }

    public final LabelMatcherItemContext labelMatcherItem() throws RecognitionException {
        LabelMatcherItemContext _localctx = new LabelMatcherItemContext(_ctx, getState());
        enterRule(_localctx, 50, RULE_labelMatcherItem);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(365);
                match(IDENTIFIER);
                setState(366);
                labelMatcherOp();
                setState(367);
                string();
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class LabelMatcherOpContext extends ParserRuleContext {
        public TerminalNode EQ() {
            return getToken(AlertExpressionParser.EQ, 0);
        }

        public TerminalNode NE() {
            return getToken(AlertExpressionParser.NE, 0);
        }

        public LabelMatcherOpContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_labelMatcherOp;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitLabelMatcherOp(this);
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
                setState(369);
                _la = _input.LA(1);
                if (!(_la == EQ || _la == NE)) {
                    _errHandler.recoverInline(this);
                } else {
                    if (_input.LA(1) == Token.EOF) matchedEOF = true;
                    _errHandler.reportMatch(this);
                    consume();
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class LabelListContext extends ParserRuleContext {
        public TerminalNode LPAREN() {
            return getToken(AlertExpressionParser.LPAREN, 0);
        }

        public List<TerminalNode> IDENTIFIER() {
            return getTokens(AlertExpressionParser.IDENTIFIER);
        }

        public TerminalNode IDENTIFIER(int i) {
            return getToken(AlertExpressionParser.IDENTIFIER, i);
        }

        public TerminalNode RPAREN() {
            return getToken(AlertExpressionParser.RPAREN, 0);
        }

        public List<TerminalNode> COMMA() {
            return getTokens(AlertExpressionParser.COMMA);
        }

        public TerminalNode COMMA(int i) {
            return getToken(AlertExpressionParser.COMMA, i);
        }

        public LabelListContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_labelList;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitLabelList(this);
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
                setState(371);
                match(LPAREN);
                setState(372);
                match(IDENTIFIER);
                setState(377);
                _errHandler.sync(this);
                _la = _input.LA(1);
                while (_la == COMMA) {
                    {
                        {
                            setState(373);
                            match(COMMA);
                            setState(374);
                            match(IDENTIFIER);
                        }
                    }
                    setState(379);
                    _errHandler.sync(this);
                    _la = _input.LA(1);
                }
                setState(380);
                match(RPAREN);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class InstantVectorOpContext extends ParserRuleContext {
        public TerminalNode LBRACKET() {
            return getToken(AlertExpressionParser.LBRACKET, 0);
        }

        public DurationContext duration() {
            return getRuleContext(DurationContext.class, 0);
        }

        public TerminalNode RBRACKET() {
            return getToken(AlertExpressionParser.RBRACKET, 0);
        }

        public InstantVectorOpContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_instantVectorOp;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitInstantVectorOp(this);
            else return visitor.visitChildren(this);
        }
    }

    public final InstantVectorOpContext instantVectorOp() throws RecognitionException {
        InstantVectorOpContext _localctx = new InstantVectorOpContext(_ctx, getState());
        enterRule(_localctx, 56, RULE_instantVectorOp);
        try {
            enterOuterAlt(_localctx, 1);
            {
                setState(382);
                match(LBRACKET);
                setState(383);
                duration();
                setState(384);
                match(RBRACKET);
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    @SuppressWarnings("CheckReturnValue")
    public static class AggregationOperatorContext extends ParserRuleContext {
        public TerminalNode SUM() {
            return getToken(AlertExpressionParser.SUM, 0);
        }

        public TerminalNode AVG() {
            return getToken(AlertExpressionParser.AVG, 0);
        }

        public TerminalNode COUNT() {
            return getToken(AlertExpressionParser.COUNT, 0);
        }

        public TerminalNode MIN() {
            return getToken(AlertExpressionParser.MIN, 0);
        }

        public TerminalNode MAX() {
            return getToken(AlertExpressionParser.MAX, 0);
        }

        public TerminalNode STDDEV() {
            return getToken(AlertExpressionParser.STDDEV, 0);
        }

        public TerminalNode STDVAR() {
            return getToken(AlertExpressionParser.STDVAR, 0);
        }

        public TerminalNode TOPK() {
            return getToken(AlertExpressionParser.TOPK, 0);
        }

        public TerminalNode BOTTOMK() {
            return getToken(AlertExpressionParser.BOTTOMK, 0);
        }

        public TerminalNode QUANTILE() {
            return getToken(AlertExpressionParser.QUANTILE, 0);
        }

        public AggregationOperatorContext(ParserRuleContext parent, int invokingState) {
            super(parent, invokingState);
        }

        @Override
        public int getRuleIndex() {
            return RULE_aggregationOperator;
        }

        @Override
        public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
            if (visitor instanceof AlertExpressionVisitor)
                return ((AlertExpressionVisitor<? extends T>) visitor).visitAggregationOperator(this);
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
                setState(386);
                _la = _input.LA(1);
                if (!((((_la) & ~0x3f) == 0 && ((1L << _la) & 121324437504L) != 0))) {
                    _errHandler.recoverInline(this);
                } else {
                    if (_input.LA(1) == Token.EOF) matchedEOF = true;
                    _errHandler.reportMatch(this);
                    consume();
                }
            }
        } catch (RecognitionException re) {
            _localctx.exception = re;
            _errHandler.reportError(this, re);
            _errHandler.recover(this, re);
        } finally {
            exitRule();
        }
        return _localctx;
    }

    public boolean sempred(RuleContext _localctx, int ruleIndex, int predIndex) {
        switch (ruleIndex) {
            case 1:
                return expr_sempred((ExprContext) _localctx, predIndex);
            case 18:
                return conditionList_sempred((ConditionListContext) _localctx, predIndex);
            case 22:
                return promql_sempred((PromqlContext) _localctx, predIndex);
        }
        return true;
    }

    private boolean expr_sempred(ExprContext _localctx, int predIndex) {
        switch (predIndex) {
            case 0:
                return precpred(_ctx, 9);
            case 1:
                return precpred(_ctx, 8);
            case 2:
                return precpred(_ctx, 7);
            case 3:
                return precpred(_ctx, 6);
        }
        return true;
    }

    private boolean conditionList_sempred(ConditionListContext _localctx, int predIndex) {
        switch (predIndex) {
            case 4:
                return precpred(_ctx, 4);
            case 5:
                return precpred(_ctx, 3);
        }
        return true;
    }

    private boolean promql_sempred(PromqlContext _localctx, int predIndex) {
        switch (predIndex) {
            case 6:
                return precpred(_ctx, 4);
            case 7:
                return precpred(_ctx, 3);
            case 8:
                return precpred(_ctx, 2);
        }
        return true;
    }

    public static final String _serializedATN = "\u0004\u0001F\u0185\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002" + "\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002" + "\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007\u0007\u0007\u0002" + "\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b\u0007\u000b\u0002" + "\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002\u000f\u0007\u000f" + "\u0002\u0010\u0007\u0010\u0002\u0011\u0007\u0011\u0002\u0012\u0007\u0012" + "\u0002\u0013\u0007\u0013\u0002\u0014\u0007\u0014\u0002\u0015\u0007\u0015" + "\u0002\u0016\u0007\u0016\u0002\u0017\u0007\u0017\u0002\u0018\u0007\u0018" + "\u0002\u0019\u0007\u0019\u0002\u001a\u0007\u001a\u0002\u001b\u0007\u001b" + "\u0002\u001c\u0007\u001c\u0002\u001d\u0007\u001d\u0001\u0000\u0001\u0000" + "\u0001\u0000\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001" + "\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001" + "\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001" + "\u0001\u0001\u0003\u0001R\b\u0001\u0001\u0001\u0001\u0001\u0001\u0001" + "\u0003\u0001W\b\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001" + "\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001" + "\u0005\u0001c\b\u0001\n\u0001\f\u0001f\t\u0001\u0001\u0002\u0001\u0002" + "\u0001\u0002\u0001\u0002\u0001\u0002\u0001\u0003\u0001\u0003\u0001\u0003" + "\u0005\u0003p\b\u0003\n\u0003\f\u0003s\t\u0003\u0001\u0004\u0001\u0004" + "\u0001\u0004\u0001\u0004\u0003\u0004y\b\u0004\u0001\u0005\u0001\u0005" + "\u0001\u0006\u0001\u0006\u0001\u0007\u0001\u0007\u0001\b\u0001\b\u0001" + "\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0003\t\u0089\b\t\u0001\t\u0001" + "\t\u0001\t\u0003\t\u008e\b\t\u0001\t\u0001\t\u0003\t\u0092\b\t\u0001\t" + "\u0001\t\u0001\t\u0003\t\u0097\b\t\u0001\t\u0001\t\u0003\t\u009b\b\t\u0001" + "\n\u0001\n\u0001\n\u0005\n\u00a0\b\n\n\n\f\n\u00a3\t\n\u0001\u000b\u0001" + "\u000b\u0003\u000b\u00a7\b\u000b\u0001\u000b\u0003\u000b\u00aa\b\u000b" + "\u0001\u000b\u0001\u000b\u0003\u000b\u00ae\b\u000b\u0001\u000b\u0003\u000b" + "\u00b1\b\u000b\u0001\u000b\u0001\u000b\u0003\u000b\u00b5\b\u000b\u0001" + "\u000b\u0003\u000b\u00b8\b\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001" + "\u000b\u0003\u000b\u00be\b\u000b\u0001\u000b\u0003\u000b\u00c1\b\u000b" + "\u0003\u000b\u00c3\b\u000b\u0001\f\u0001\f\u0001\f\u0005\f\u00c8\b\f\n" + "\f\f\f\u00cb\t\f\u0001\r\u0001\r\u0001\r\u0005\r\u00d0\b\r\n\r\f\r\u00d3" + "\t\r\u0001\u000e\u0001\u000e\u0003\u000e\u00d7\b\u000e\u0001\u000e\u0001" + "\u000e\u0003\u000e\u00db\b\u000e\u0003\u000e\u00dd\b\u000e\u0001\u000f" + "\u0001\u000f\u0001\u0010\u0001\u0010\u0001\u0010\u0005\u0010\u00e4\b\u0010" + "\n\u0010\f\u0010\u00e7\t\u0010\u0001\u0011\u0001\u0011\u0003\u0011\u00eb" + "\b\u0011\u0001\u0011\u0003\u0011\u00ee\b\u0011\u0001\u0011\u0001\u0011" + "\u0001\u0011\u0001\u0011\u0001\u0011\u0001\u0011\u0003\u0011\u00f6\b\u0011" + "\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012" + "\u0003\u0012\u00fe\b\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012" + "\u0001\u0012\u0001\u0012\u0005\u0012\u0106\b\u0012\n\u0012\f\u0012\u0109" + "\t\u0012\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001" + "\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0001" + "\u0013\u0001\u0013\u0001\u0013\u0001\u0013\u0003\u0013\u011a\b\u0013\u0001" + "\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001" + "\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0001" + "\u0014\u0001\u0014\u0003\u0014\u012a\b\u0014\u0001\u0015\u0001\u0015\u0001" + "\u0015\u0001\u0015\u0001\u0015\u0001\u0015\u0001\u0015\u0001\u0015\u0001" + "\u0015\u0001\u0015\u0001\u0015\u0001\u0015\u0003\u0015\u0138\b\u0015\u0001" + "\u0016\u0001\u0016\u0001\u0016\u0003\u0016\u013d\b\u0016\u0001\u0016\u0001" + "\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0003\u0016\u0144\b\u0016\u0001" + "\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0003\u0016\u014a\b\u0016\u0001" + "\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001" + "\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001\u0016\u0001" + "\u0016\u0001\u0016\u0001\u0016\u0005\u0016\u015b\b\u0016\n\u0016\f\u0016" + "\u015e\t\u0016\u0001\u0017\u0001\u0017\u0003\u0017\u0162\b\u0017\u0001" + "\u0017\u0001\u0017\u0001\u0018\u0001\u0018\u0001\u0018\u0005\u0018\u0169" + "\b\u0018\n\u0018\f\u0018\u016c\t\u0018\u0001\u0019\u0001\u0019\u0001\u0019" + "\u0001\u0019\u0001\u001a\u0001\u001a\u0001\u001b\u0001\u001b\u0001\u001b" + "\u0001\u001b\u0005\u001b\u0178\b\u001b\n\u001b\f\u001b\u017b\t\u001b\u0001" + "\u001b\u0001\u001b\u0001\u001c\u0001\u001c\u0001\u001c\u0001\u001c\u0001" + "\u001d\u0001\u001d\u0001\u001d\u0000\u0003\u0002$,\u001e\u0000\u0002\u0004" + "\u0006\b\n\f\u000e\u0010\u0012\u0014\u0016\u0018\u001a\u001c\u001e \"" + "$&(*,.02468:\u0000\u0006\u0001\u0000-2\u0001\u0000>@\u0004\u0000\u0017" + "\u001b\u001f!%*CC\u0001\u0000\u000f\u0010\u0001\u000012\u0002\u0000\u0017" + "\u001d\"$\u01af\u0000<\u0001\u0000\u0000\u0000\u0002Q\u0001\u0000\u0000" + "\u0000\u0004g\u0001\u0000\u0000\u0000\u0006l\u0001\u0000\u0000\u0000\b" + "x\u0001\u0000\u0000\u0000\nz\u0001\u0000\u0000\u0000\f|\u0001\u0000\u0000" + "\u0000\u000e~\u0001\u0000\u0000\u0000\u0010\u0080\u0001\u0000\u0000\u0000" + "\u0012\u0082\u0001\u0000\u0000\u0000\u0014\u009c\u0001\u0000\u0000\u0000" + "\u0016\u00c2\u0001\u0000\u0000\u0000\u0018\u00c4\u0001\u0000\u0000\u0000" + "\u001a\u00cc\u0001\u0000\u0000\u0000\u001c\u00dc\u0001\u0000\u0000\u0000" + "\u001e\u00de\u0001\u0000\u0000\u0000 \u00e0\u0001\u0000\u0000\u0000\"" + "\u00f5\u0001\u0000\u0000\u0000$\u00fd\u0001\u0000\u0000\u0000&\u0119\u0001" + "\u0000\u0000\u0000(\u0129\u0001\u0000\u0000\u0000*\u0137\u0001\u0000\u0000" + "\u0000,\u0149\u0001\u0000\u0000\u0000.\u015f\u0001\u0000\u0000\u00000" + "\u0165\u0001\u0000\u0000\u00002\u016d\u0001\u0000\u0000\u00004\u0171\u0001" + "\u0000\u0000\u00006\u0173\u0001\u0000\u0000\u00008\u017e\u0001\u0000\u0000" + "\u0000:\u0182\u0001\u0000\u0000\u0000<=\u0003\u0002\u0001\u0000=>\u0005" + "\u0000\u0000\u0001>\u0001\u0001\u0000\u0000\u0000?@\u0006\u0001\uffff" + "\uffff\u0000@A\u00054\u0000\u0000AB\u0003\u0002\u0001\u0000BC\u00055\u0000" + "\u0000CR\u0001\u0000\u0000\u0000DR\u0003,\u0016\u0000ER\u0003\u0012\t" + "\u0000FR\u0003\n\u0005\u0000GH\u0005+\u0000\u0000HI\u00054\u0000\u0000" + "IJ\u0003\f\u0006\u0000JK\u00055\u0000\u0000KR\u0001\u0000\u0000\u0000" + "LM\u0005,\u0000\u0000MN\u00054\u0000\u0000NO\u0003\f\u0006\u0000OP\u0005" + "5\u0000\u0000PR\u0001\u0000\u0000\u0000Q?\u0001\u0000\u0000\u0000QD\u0001" + "\u0000\u0000\u0000QE\u0001\u0000\u0000\u0000QF\u0001\u0000\u0000\u0000" + "QG\u0001\u0000\u0000\u0000QL\u0001\u0000\u0000\u0000Rd\u0001\u0000\u0000" + "\u0000ST\n\t\u0000\u0000TV\u0007\u0000\u0000\u0000UW\u00053\u0000\u0000" + "VU\u0001\u0000\u0000\u0000VW\u0001\u0000\u0000\u0000WX\u0001\u0000\u0000" + "\u0000Xc\u0003\u0002\u0001\nYZ\n\b\u0000\u0000Z[\u0005\u0001\u0000\u0000" + "[c\u0003\u0002\u0001\t\\]\n\u0007\u0000\u0000]^\u0005\u0003\u0000\u0000" + "^c\u0003\u0002\u0001\b_`\n\u0006\u0000\u0000`a\u0005\u0002\u0000\u0000" + "ac\u0003\u0002\u0001\u0007bS\u0001\u0000\u0000\u0000bY\u0001\u0000\u0000" + "\u0000b\\\u0001\u0000\u0000\u0000b_\u0001\u0000\u0000\u0000cf\u0001\u0000" + "\u0000\u0000db\u0001\u0000\u0000\u0000de\u0001\u0000\u0000\u0000e\u0003" + "\u0001\u0000\u0000\u0000fd\u0001\u0000\u0000\u0000gh\u0003\u0010\b\u0000" + "hi\u00054\u0000\u0000ij\u0003\u0006\u0003\u0000jk\u00055\u0000\u0000k" + "\u0005\u0001\u0000\u0000\u0000lq\u0003\b\u0004\u0000mn\u0005:\u0000\u0000" + "np\u0003\b\u0004\u0000om\u0001\u0000\u0000\u0000ps\u0001\u0000\u0000\u0000" + "qo\u0001\u0000\u0000\u0000qr\u0001\u0000\u0000\u0000r\u0007\u0001\u0000" + "\u0000\u0000sq\u0001\u0000\u0000\u0000ty\u0003\u0002\u0001\u0000uy\u0005" + "\u0016\u0000\u0000vy\u0003\f\u0006\u0000wy\u0003\u000e\u0007\u0000xt\u0001" + "\u0000\u0000\u0000xu\u0001\u0000\u0000\u0000xv\u0001\u0000\u0000\u0000" + "xw\u0001\u0000\u0000\u0000y\t\u0001\u0000\u0000\u0000z{\u0007\u0001\u0000" + "\u0000{\u000b\u0001\u0000\u0000\u0000|}\u0005B\u0000\u0000}\r\u0001\u0000" + "\u0000\u0000~\u007f\u0005A\u0000\u0000\u007f\u000f\u0001\u0000\u0000\u0000" + "\u0080\u0081\u0007\u0002\u0000\u0000\u0081\u0011\u0001\u0000\u0000\u0000" + "\u0082\u0083\u0005\u0005\u0000\u0000\u0083\u0084\u0003\u0014\n\u0000\u0084" + "\u0085\u0005\u0006\u0000\u0000\u0085\u0088\u0003 \u0010\u0000\u0086\u0087" + "\u0005\u0007\u0000\u0000\u0087\u0089\u0003$\u0012\u0000\u0088\u0086\u0001" + "\u0000\u0000\u0000\u0088\u0089\u0001\u0000\u0000\u0000\u0089\u008d\u0001" + "\u0000\u0000\u0000\u008a\u008b\u0005\b\u0000\u0000\u008b\u008c\u0005\t" + "\u0000\u0000\u008c\u008e\u0003\u0018\f\u0000\u008d\u008a\u0001\u0000\u0000" + "\u0000\u008d\u008e\u0001\u0000\u0000\u0000\u008e\u0091\u0001\u0000\u0000" + "\u0000\u008f\u0090\u0005\n\u0000\u0000\u0090\u0092\u0003$\u0012\u0000" + "\u0091\u008f\u0001\u0000\u0000\u0000\u0091\u0092\u0001\u0000\u0000\u0000" + "\u0092\u0096\u0001\u0000\u0000\u0000\u0093\u0094\u0005\u000b\u0000\u0000" + "\u0094\u0095\u0005\t\u0000\u0000\u0095\u0097\u0003\u001a\r\u0000\u0096" + "\u0093\u0001\u0000\u0000\u0000\u0096\u0097\u0001\u0000\u0000\u0000\u0097" + "\u009a\u0001\u0000\u0000\u0000\u0098\u0099\u0005\f\u0000\u0000\u0099\u009b" + "\u0003\u001e\u000f\u0000\u009a\u0098\u0001\u0000\u0000\u0000\u009a\u009b" + "\u0001\u0000\u0000\u0000\u009b\u0013\u0001\u0000\u0000\u0000\u009c\u00a1" + "\u0003\u0016\u000b\u0000\u009d\u009e\u0005:\u0000\u0000\u009e\u00a0\u0003" + "\u0016\u000b\u0000\u009f\u009d\u0001\u0000\u0000\u0000\u00a0\u00a3\u0001" + "\u0000\u0000\u0000\u00a1\u009f\u0001\u0000\u0000\u0000\u00a1\u00a2\u0001" + "\u0000\u0000\u0000\u00a2\u0015\u0001\u0000\u0000\u0000\u00a3\u00a1\u0001" + "\u0000\u0000\u0000\u00a4\u00a9\u0003\u0004\u0002\u0000\u00a5\u00a7\u0005" + "\u000e\u0000\u0000\u00a6\u00a5\u0001\u0000\u0000\u0000\u00a6\u00a7\u0001" + "\u0000\u0000\u0000\u00a7\u00a8\u0001\u0000\u0000\u0000\u00a8\u00aa\u0005" + "C\u0000\u0000\u00a9\u00a6\u0001\u0000\u0000\u0000\u00a9\u00aa\u0001\u0000" + "\u0000\u0000\u00aa\u00c3\u0001\u0000\u0000\u0000\u00ab\u00b0\u0005C\u0000" + "\u0000\u00ac\u00ae\u0005\u000e\u0000\u0000\u00ad\u00ac\u0001\u0000\u0000" + "\u0000\u00ad\u00ae\u0001\u0000\u0000\u0000\u00ae\u00af\u0001\u0000\u0000" + "\u0000\u00af\u00b1\u0005C\u0000\u0000\u00b0\u00ad\u0001\u0000\u0000\u0000" + "\u00b0\u00b1\u0001\u0000\u0000\u0000\u00b1\u00c3\u0001\u0000\u0000\u0000" + "\u00b2\u00b7\u0005\u0016\u0000\u0000\u00b3\u00b5\u0005\u000e\u0000\u0000" + "\u00b4\u00b3\u0001\u0000\u0000\u0000\u00b4\u00b5\u0001\u0000\u0000\u0000" + "\u00b5\u00b6\u0001\u0000\u0000\u0000\u00b6\u00b8\u0005C\u0000\u0000\u00b7" + "\u00b4\u0001\u0000\u0000\u0000\u00b7\u00b8\u0001\u0000\u0000\u0000\u00b8" + "\u00c3\u0001\u0000\u0000\u0000\u00b9\u00ba\u0005C\u0000\u0000\u00ba\u00bb" + "\u0005;\u0000\u0000\u00bb\u00c0\u0005C\u0000\u0000\u00bc\u00be\u0005\u000e" + "\u0000\u0000\u00bd\u00bc\u0001\u0000\u0000\u0000\u00bd\u00be\u0001\u0000" + "\u0000\u0000\u00be\u00bf\u0001\u0000\u0000\u0000\u00bf\u00c1\u0005C\u0000" + "\u0000\u00c0\u00bd\u0001\u0000\u0000\u0000\u00c0\u00c1\u0001\u0000\u0000" + "\u0000\u00c1\u00c3\u0001\u0000\u0000\u0000\u00c2\u00a4\u0001\u0000\u0000" + "\u0000\u00c2\u00ab\u0001\u0000\u0000\u0000\u00c2\u00b2\u0001\u0000\u0000" + "\u0000\u00c2\u00b9\u0001\u0000\u0000\u0000\u00c3\u0017\u0001\u0000\u0000" + "\u0000\u00c4\u00c9\u0005C\u0000\u0000\u00c5\u00c6\u0005:\u0000\u0000\u00c6" + "\u00c8\u0005C\u0000\u0000\u00c7\u00c5\u0001\u0000\u0000\u0000\u00c8\u00cb" + "\u0001\u0000\u0000\u0000\u00c9\u00c7\u0001\u0000\u0000\u0000\u00c9\u00ca" + "\u0001\u0000\u0000\u0000\u00ca\u0019\u0001\u0000\u0000\u0000\u00cb\u00c9" + "\u0001\u0000\u0000\u0000\u00cc\u00d1\u0003\u001c\u000e\u0000\u00cd\u00ce" + "\u0005:\u0000\u0000\u00ce\u00d0\u0003\u001c\u000e\u0000\u00cf\u00cd\u0001" + "\u0000\u0000\u0000\u00d0\u00d3\u0001\u0000\u0000\u0000\u00d1\u00cf\u0001" + "\u0000\u0000\u0000\u00d1\u00d2\u0001\u0000\u0000\u0000\u00d2\u001b\u0001" + "\u0000\u0000\u0000\u00d3\u00d1\u0001\u0000\u0000\u0000\u00d4\u00d6\u0005" + "C\u0000\u0000\u00d5\u00d7\u0007\u0003\u0000\u0000\u00d6\u00d5\u0001\u0000" + "\u0000\u0000\u00d6\u00d7\u0001\u0000\u0000\u0000\u00d7\u00dd\u0001\u0000" + "\u0000\u0000\u00d8\u00da\u0003\u0004\u0002\u0000\u00d9\u00db\u0007\u0003" + "\u0000\u0000\u00da\u00d9\u0001\u0000\u0000\u0000\u00da\u00db\u0001\u0000" + "\u0000\u0000\u00db\u00dd\u0001\u0000\u0000\u0000\u00dc\u00d4\u0001\u0000" + "\u0000\u0000\u00dc\u00d8\u0001\u0000\u0000\u0000\u00dd\u001d\u0001\u0000" + "\u0000\u0000\u00de\u00df\u0005@\u0000\u0000\u00df\u001f\u0001\u0000\u0000" + "\u0000\u00e0\u00e5\u0003\"\u0011\u0000\u00e1\u00e2\u0005:\u0000\u0000" + "\u00e2\u00e4\u0003\"\u0011\u0000\u00e3\u00e1\u0001\u0000\u0000\u0000\u00e4" + "\u00e7\u0001\u0000\u0000\u0000\u00e5\u00e3\u0001\u0000\u0000\u0000\u00e5" + "\u00e6\u0001\u0000\u0000\u0000\u00e6!\u0001\u0000\u0000\u0000\u00e7\u00e5" + "\u0001\u0000\u0000\u0000\u00e8\u00ed\u0005C\u0000\u0000\u00e9\u00eb\u0005" + "\u000e\u0000\u0000\u00ea\u00e9\u0001\u0000\u0000\u0000\u00ea\u00eb\u0001" + "\u0000\u0000\u0000\u00eb\u00ec\u0001\u0000\u0000\u0000\u00ec\u00ee\u0005" + "C\u0000\u0000\u00ed\u00ea\u0001\u0000\u0000\u0000\u00ed\u00ee\u0001\u0000" + "\u0000\u0000\u00ee\u00f6\u0001\u0000\u0000\u0000\u00ef\u00f0\u00054\u0000" + "\u0000\u00f0\u00f1\u0003\u0012\t\u0000\u00f1\u00f2\u00055\u0000\u0000" + "\u00f2\u00f3\u0005\u000e\u0000\u0000\u00f3\u00f4\u0005C\u0000\u0000\u00f4" + "\u00f6\u0001\u0000\u0000\u0000\u00f5\u00e8\u0001\u0000\u0000\u0000\u00f5" + "\u00ef\u0001\u0000\u0000\u0000\u00f6#\u0001\u0000\u0000\u0000\u00f7\u00f8" + "\u0006\u0012\uffff\uffff\u0000\u00f8\u00fe\u0003(\u0014\u0000\u00f9\u00fa" + "\u00054\u0000\u0000\u00fa\u00fb\u0003$\u0012\u0000\u00fb\u00fc\u00055" + "\u0000\u0000\u00fc\u00fe\u0001\u0000\u0000\u0000\u00fd\u00f7\u0001\u0000" + "\u0000\u0000\u00fd\u00f9\u0001\u0000\u0000\u0000\u00fe\u0107\u0001\u0000" + "\u0000\u0000\u00ff\u0100\n\u0004\u0000\u0000\u0100\u0101\u0005\u0001\u0000" + "\u0000\u0101\u0106\u0003$\u0012\u0005\u0102\u0103\n\u0003\u0000\u0000" + "\u0103\u0104\u0005\u0002\u0000\u0000\u0104\u0106\u0003$\u0012\u0004\u0105" + "\u00ff\u0001\u0000\u0000\u0000\u0105\u0102\u0001\u0000\u0000\u0000\u0106" + "\u0109\u0001\u0000\u0000\u0000\u0107\u0105\u0001\u0000\u0000\u0000\u0107" + "\u0108\u0001\u0000\u0000\u0000\u0108%\u0001\u0000\u0000\u0000\u0109\u0107" + "\u0001\u0000\u0000\u0000\u010a\u011a\u00051\u0000\u0000\u010b\u011a\u0005" + "/\u0000\u0000\u010c\u011a\u0005-\u0000\u0000\u010d\u011a\u00050\u0000" + "\u0000\u010e\u011a\u0005.\u0000\u0000\u010f\u011a\u00052\u0000\u0000\u0110" + "\u011a\u0005\u0014\u0000\u0000\u0111\u0112\u0005\u0004\u0000\u0000\u0112" + "\u011a\u0005\u0014\u0000\u0000\u0113\u011a\u0005\u0011\u0000\u0000\u0114" + "\u0115\u0005\u0004\u0000\u0000\u0115\u011a\u0005\u0011\u0000\u0000\u0116" + "\u011a\u0005\u0012\u0000\u0000\u0117\u0118\u0005\u0012\u0000\u0000\u0118" + "\u011a\u0005\u0004\u0000\u0000\u0119\u010a\u0001\u0000\u0000\u0000\u0119" + "\u010b\u0001\u0000\u0000\u0000\u0119\u010c\u0001\u0000\u0000\u0000\u0119" + "\u010d\u0001\u0000\u0000\u0000\u0119\u010e\u0001\u0000\u0000\u0000\u0119" + "\u010f\u0001\u0000\u0000\u0000\u0119\u0110\u0001\u0000\u0000\u0000\u0119" + "\u0111\u0001\u0000\u0000\u0000\u0119\u0113\u0001\u0000\u0000\u0000\u0119" + "\u0114\u0001\u0000\u0000\u0000\u0119\u0116\u0001\u0000\u0000\u0000\u0119" + "\u0117\u0001\u0000\u0000\u0000\u011a\'\u0001\u0000\u0000\u0000\u011b\u011c" + "\u0003*\u0015\u0000\u011c\u011d\u0003&\u0013\u0000\u011d\u011e\u0003*" + "\u0015\u0000\u011e\u012a\u0001\u0000\u0000\u0000\u011f\u0120\u00054\u0000" + "\u0000\u0120\u0121\u0003(\u0014\u0000\u0121\u0122\u00055\u0000\u0000\u0122" + "\u012a\u0001\u0000\u0000\u0000\u0123\u0124\u0005C\u0000\u0000\u0124\u0125" + "\u0005\u0015\u0000\u0000\u0125\u0126\u0003\n\u0005\u0000\u0126\u0127\u0005" + "\u0001\u0000\u0000\u0127\u0128\u0003\n\u0005\u0000\u0128\u012a\u0001\u0000" + "\u0000\u0000\u0129\u011b\u0001\u0000\u0000\u0000\u0129\u011f\u0001\u0000" + "\u0000\u0000\u0129\u0123\u0001\u0000\u0000\u0000\u012a)\u0001\u0000\u0000" + "\u0000\u012b\u0138\u0003\n\u0005\u0000\u012c\u0138\u0003\f\u0006\u0000" + "\u012d\u0138\u0005C\u0000\u0000\u012e\u012f\u0005C\u0000\u0000\u012f\u0130" + "\u0005;\u0000\u0000\u0130\u0138\u0005C\u0000\u0000\u0131\u0138\u0005\u0013" + "\u0000\u0000\u0132\u0133\u00054\u0000\u0000\u0133\u0134\u0003\u0012\t" + "\u0000\u0134\u0135\u00055\u0000\u0000\u0135\u0138\u0001\u0000\u0000\u0000" + "\u0136\u0138\u0003\u0004\u0002\u0000\u0137\u012b\u0001\u0000\u0000\u0000" + "\u0137\u012c\u0001\u0000\u0000\u0000\u0137\u012d\u0001\u0000\u0000\u0000" + "\u0137\u012e\u0001\u0000\u0000\u0000\u0137\u0131\u0001\u0000\u0000\u0000" + "\u0137\u0132\u0001\u0000\u0000\u0000\u0137\u0136\u0001\u0000\u0000\u0000" + "\u0138+\u0001\u0000\u0000\u0000\u0139\u013a\u0006\u0016\uffff\uffff\u0000" + "\u013a\u013c\u0003.\u0017\u0000\u013b\u013d\u00038\u001c\u0000\u013c\u013b" + "\u0001\u0000\u0000\u0000\u013c\u013d\u0001\u0000\u0000\u0000\u013d\u014a" + "\u0001\u0000\u0000\u0000\u013e\u013f\u0003:\u001d\u0000\u013f\u0140\u0005" + "4\u0000\u0000\u0140\u0143\u0003,\u0016\u0000\u0141\u0142\u0005\t\u0000" + "\u0000\u0142\u0144\u00036\u001b\u0000\u0143\u0141\u0001\u0000\u0000\u0000" + "\u0143\u0144\u0001\u0000\u0000\u0000\u0144\u0145\u0001\u0000\u0000\u0000" + "\u0145\u0146\u00055\u0000\u0000\u0146\u014a\u0001\u0000\u0000\u0000\u0147" + "\u014a\u0003\u0004\u0002\u0000\u0148\u014a\u0005C\u0000\u0000\u0149\u0139" + "\u0001\u0000\u0000\u0000\u0149\u013e\u0001\u0000\u0000\u0000\u0149\u0147" + "\u0001\u0000\u0000\u0000\u0149\u0148\u0001\u0000\u0000\u0000\u014a\u015c" + "\u0001\u0000\u0000\u0000\u014b\u014c\n\u0004\u0000\u0000\u014c\u014d\u0005" + "8\u0000\u0000\u014d\u014e\u0003\u000e\u0007\u0000\u014e\u014f\u00059\u0000" + "\u0000\u014f\u015b\u0001\u0000\u0000\u0000\u0150\u0151\n\u0003\u0000\u0000" + "\u0151\u0152\u00058\u0000\u0000\u0152\u0153\u0003\u000e\u0007\u0000\u0153" + "\u0154\u0005<\u0000\u0000\u0154\u0155\u0003\u000e\u0007\u0000\u0155\u0156" + "\u00059\u0000\u0000\u0156\u015b\u0001\u0000\u0000\u0000\u0157\u0158\n" + "\u0002\u0000\u0000\u0158\u0159\u0005\r\u0000\u0000\u0159\u015b\u0003\u000e" + "\u0007\u0000\u015a\u014b\u0001\u0000\u0000\u0000\u015a\u0150\u0001\u0000" + "\u0000\u0000\u015a\u0157\u0001\u0000\u0000\u0000\u015b\u015e\u0001\u0000" + "\u0000\u0000\u015c\u015a\u0001\u0000\u0000\u0000\u015c\u015d\u0001\u0000" + "\u0000\u0000\u015d-\u0001\u0000\u0000\u0000\u015e\u015c\u0001\u0000\u0000" + "\u0000\u015f\u0161\u00056\u0000\u0000\u0160\u0162\u00030\u0018\u0000\u0161" + "\u0160\u0001\u0000\u0000\u0000\u0161\u0162\u0001\u0000\u0000\u0000\u0162" + "\u0163\u0001\u0000\u0000\u0000\u0163\u0164\u00057\u0000\u0000\u0164/\u0001" + "\u0000\u0000\u0000\u0165\u016a\u00032\u0019\u0000\u0166\u0167\u0005:\u0000" + "\u0000\u0167\u0169\u00032\u0019\u0000\u0168\u0166\u0001\u0000\u0000\u0000" + "\u0169\u016c\u0001\u0000\u0000\u0000\u016a\u0168\u0001\u0000\u0000\u0000" + "\u016a\u016b\u0001\u0000\u0000\u0000\u016b1\u0001\u0000\u0000\u0000\u016c" + "\u016a\u0001\u0000\u0000\u0000\u016d\u016e\u0005C\u0000\u0000\u016e\u016f" + "\u00034\u001a\u0000\u016f\u0170\u0003\f\u0006\u0000\u01703\u0001\u0000" + "\u0000\u0000\u0171\u0172\u0007\u0004\u0000\u0000\u01725\u0001\u0000\u0000" + "\u0000\u0173\u0174\u00054\u0000\u0000\u0174\u0179\u0005C\u0000\u0000\u0175" + "\u0176\u0005:\u0000\u0000\u0176\u0178\u0005C\u0000\u0000\u0177\u0175\u0001" + "\u0000\u0000\u0000\u0178\u017b\u0001\u0000\u0000\u0000\u0179\u0177\u0001" + "\u0000\u0000\u0000\u0179\u017a\u0001\u0000\u0000\u0000\u017a\u017c\u0001" + "\u0000\u0000\u0000\u017b\u0179\u0001\u0000\u0000\u0000\u017c\u017d\u0005" + "5\u0000\u0000\u017d7\u0001\u0000\u0000\u0000\u017e\u017f\u00058\u0000" + "\u0000\u017f\u0180\u0003\u000e\u0007\u0000\u0180\u0181\u00059\u0000\u0000" + "\u01819\u0001\u0000\u0000\u0000\u0182\u0183\u0007\u0005\u0000\u0000\u0183" + ";\u0001\u0000\u0000\u0000,QVbdqx\u0088\u008d\u0091\u0096\u009a\u00a1\u00a6" + "\u00a9\u00ad\u00b0\u00b4\u00b7\u00bd\u00c0\u00c2\u00c9\u00d1\u00d6\u00da" + "\u00dc\u00e5\u00ea\u00ed\u00f5\u00fd\u0105\u0107\u0119\u0129\u0137\u013c" + "\u0143\u0149\u015a\u015c\u0161\u016a\u0179";
    public static final ATN _ATN = new ATNDeserializer().deserialize(_serializedATN.toCharArray());

    static {
        _decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
        for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
            _decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
        }
    }
}