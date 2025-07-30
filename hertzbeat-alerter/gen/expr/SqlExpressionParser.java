// Generated from D:/Project/hertzbeat/hertzbeat-alerter/src/main/resources/expr/SqlExpression.g4 by ANTLR 4.13.2
package expr;
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue", "this-escape"})
public class SqlExpressionParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.2", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		AND=1, OR=2, NOT=3, SELECT=4, FROM=5, WHERE=6, GROUP=7, BY=8, HAVING=9, 
		ORDER=10, LIMIT=11, OFFSET=12, AS=13, ASC=14, DESC=15, IN=16, IS=17, NULL=18, 
		LIKE=19, BETWEEN=20, STAR=21, COUNT=22, SUM=23, AVG=24, MIN=25, MAX=26, 
		SQL_FUNCTION=27, GT=28, GE=29, LT=30, LE=31, EQ=32, NE=33, LPAREN=34, 
		RPAREN=35, LBRACKET=36, RBRACKET=37, COMMA=38, DOT=39, SEMICOLON=40, FLOAT=41, 
		NUMBER=42, STRING=43, IDENTIFIER=44, WS=45, LINE_COMMENT=46, BLOCK_COMMENT=47;
	public static final int
		RULE_expression = 0, RULE_sqlExpr = 1, RULE_selectSql = 2, RULE_selectFieldList = 3, 
		RULE_selectField = 4, RULE_relList = 5, RULE_relation = 6, RULE_conditionList = 7, 
		RULE_compOp = 8, RULE_condition = 9, RULE_conditionUnit = 10, RULE_functionCall = 11, 
		RULE_functionName = 12, RULE_parameterList = 13, RULE_parameter = 14, 
		RULE_groupByList = 15, RULE_orderByList = 16, RULE_orderByField = 17, 
		RULE_limitClause = 18, RULE_number = 19, RULE_string = 20;
	private static String[] makeRuleNames() {
		return new String[] {
			"expression", "sqlExpr", "selectSql", "selectFieldList", "selectField", 
			"relList", "relation", "conditionList", "compOp", "condition", "conditionUnit", 
			"functionCall", "functionName", "parameterList", "parameter", "groupByList", 
			"orderByList", "orderByField", "limitClause", "number", "string"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, null, null, null, null, null, null, null, null, null, null, null, 
			null, null, null, null, null, null, null, null, null, "'*'", null, null, 
			null, null, null, null, "'>'", "'>='", "'<'", "'<='", null, "'!='", "'('", 
			"')'", "'['", "']'", "','", "'.'", "';'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "AND", "OR", "NOT", "SELECT", "FROM", "WHERE", "GROUP", "BY", "HAVING", 
			"ORDER", "LIMIT", "OFFSET", "AS", "ASC", "DESC", "IN", "IS", "NULL", 
			"LIKE", "BETWEEN", "STAR", "COUNT", "SUM", "AVG", "MIN", "MAX", "SQL_FUNCTION", 
			"GT", "GE", "LT", "LE", "EQ", "NE", "LPAREN", "RPAREN", "LBRACKET", "RBRACKET", 
			"COMMA", "DOT", "SEMICOLON", "FLOAT", "NUMBER", "STRING", "IDENTIFIER", 
			"WS", "LINE_COMMENT", "BLOCK_COMMENT"
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
	public String getGrammarFileName() { return "SqlExpression.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public SqlExpressionParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ExpressionContext extends ParserRuleContext {
		public SqlExprContext sqlExpr() {
			return getRuleContext(SqlExprContext.class,0);
		}
		public TerminalNode EOF() { return getToken(SqlExpressionParser.EOF, 0); }
		public ExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expression; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterExpression(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitExpression(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitExpression(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ExpressionContext expression() throws RecognitionException {
		ExpressionContext _localctx = new ExpressionContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_expression);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(42);
			sqlExpr();
			setState(43);
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
	public static class SqlExprContext extends ParserRuleContext {
		public SqlExprContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_sqlExpr; }
	 
		public SqlExprContext() { }
		public void copyFrom(SqlExprContext ctx) {
			super.copyFrom(ctx);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class SelectSqlCallExprContext extends SqlExprContext {
		public TerminalNode SQL_FUNCTION() { return getToken(SqlExpressionParser.SQL_FUNCTION, 0); }
		public TerminalNode LPAREN() { return getToken(SqlExpressionParser.LPAREN, 0); }
		public StringContext string() {
			return getRuleContext(StringContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(SqlExpressionParser.RPAREN, 0); }
		public SelectSqlCallExprContext(SqlExprContext ctx) { copyFrom(ctx); }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterSelectSqlCallExpr(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitSelectSqlCallExpr(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitSelectSqlCallExpr(this);
			else return visitor.visitChildren(this);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class SelectSqlExprContext extends SqlExprContext {
		public SelectSqlContext selectSql() {
			return getRuleContext(SelectSqlContext.class,0);
		}
		public SelectSqlExprContext(SqlExprContext ctx) { copyFrom(ctx); }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterSelectSqlExpr(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitSelectSqlExpr(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitSelectSqlExpr(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SqlExprContext sqlExpr() throws RecognitionException {
		SqlExprContext _localctx = new SqlExprContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_sqlExpr);
		try {
			setState(51);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case SELECT:
				_localctx = new SelectSqlExprContext(_localctx);
				enterOuterAlt(_localctx, 1);
				{
				setState(45);
				selectSql();
				}
				break;
			case SQL_FUNCTION:
				_localctx = new SelectSqlCallExprContext(_localctx);
				enterOuterAlt(_localctx, 2);
				{
				setState(46);
				match(SQL_FUNCTION);
				setState(47);
				match(LPAREN);
				setState(48);
				string();
				setState(49);
				match(RPAREN);
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
	public static class SelectSqlContext extends ParserRuleContext {
		public TerminalNode SELECT() { return getToken(SqlExpressionParser.SELECT, 0); }
		public SelectFieldListContext selectFieldList() {
			return getRuleContext(SelectFieldListContext.class,0);
		}
		public TerminalNode FROM() { return getToken(SqlExpressionParser.FROM, 0); }
		public RelListContext relList() {
			return getRuleContext(RelListContext.class,0);
		}
		public TerminalNode WHERE() { return getToken(SqlExpressionParser.WHERE, 0); }
		public List<ConditionListContext> conditionList() {
			return getRuleContexts(ConditionListContext.class);
		}
		public ConditionListContext conditionList(int i) {
			return getRuleContext(ConditionListContext.class,i);
		}
		public TerminalNode GROUP() { return getToken(SqlExpressionParser.GROUP, 0); }
		public List<TerminalNode> BY() { return getTokens(SqlExpressionParser.BY); }
		public TerminalNode BY(int i) {
			return getToken(SqlExpressionParser.BY, i);
		}
		public GroupByListContext groupByList() {
			return getRuleContext(GroupByListContext.class,0);
		}
		public TerminalNode HAVING() { return getToken(SqlExpressionParser.HAVING, 0); }
		public TerminalNode ORDER() { return getToken(SqlExpressionParser.ORDER, 0); }
		public OrderByListContext orderByList() {
			return getRuleContext(OrderByListContext.class,0);
		}
		public TerminalNode LIMIT() { return getToken(SqlExpressionParser.LIMIT, 0); }
		public LimitClauseContext limitClause() {
			return getRuleContext(LimitClauseContext.class,0);
		}
		public SelectSqlContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectSql; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterSelectSql(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitSelectSql(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitSelectSql(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SelectSqlContext selectSql() throws RecognitionException {
		SelectSqlContext _localctx = new SelectSqlContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_selectSql);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(53);
			match(SELECT);
			setState(54);
			selectFieldList();
			setState(55);
			match(FROM);
			setState(56);
			relList();
			setState(59);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==WHERE) {
				{
				setState(57);
				match(WHERE);
				setState(58);
				conditionList(0);
				}
			}

			setState(64);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==GROUP) {
				{
				setState(61);
				match(GROUP);
				setState(62);
				match(BY);
				setState(63);
				groupByList();
				}
			}

			setState(68);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==HAVING) {
				{
				setState(66);
				match(HAVING);
				setState(67);
				conditionList(0);
				}
			}

			setState(73);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==ORDER) {
				{
				setState(70);
				match(ORDER);
				setState(71);
				match(BY);
				setState(72);
				orderByList();
				}
			}

			setState(77);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==LIMIT) {
				{
				setState(75);
				match(LIMIT);
				setState(76);
				limitClause();
				}
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
		public List<TerminalNode> COMMA() { return getTokens(SqlExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(SqlExpressionParser.COMMA, i);
		}
		public SelectFieldListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectFieldList; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterSelectFieldList(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitSelectFieldList(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitSelectFieldList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SelectFieldListContext selectFieldList() throws RecognitionException {
		SelectFieldListContext _localctx = new SelectFieldListContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_selectFieldList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(79);
			selectField();
			setState(84);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(80);
				match(COMMA);
				setState(81);
				selectField();
				}
				}
				setState(86);
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
		public List<TerminalNode> IDENTIFIER() { return getTokens(SqlExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(SqlExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode AS() { return getToken(SqlExpressionParser.AS, 0); }
		public TerminalNode STAR() { return getToken(SqlExpressionParser.STAR, 0); }
		public TerminalNode DOT() { return getToken(SqlExpressionParser.DOT, 0); }
		public SelectFieldContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_selectField; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterSelectField(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitSelectField(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitSelectField(this);
			else return visitor.visitChildren(this);
		}
	}

	public final SelectFieldContext selectField() throws RecognitionException {
		SelectFieldContext _localctx = new SelectFieldContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_selectField);
		int _la;
		try {
			setState(117);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,15,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(87);
				functionCall();
				setState(92);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==AS || _la==IDENTIFIER) {
					{
					setState(89);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS) {
						{
						setState(88);
						match(AS);
						}
					}

					setState(91);
					match(IDENTIFIER);
					}
				}

				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(94);
				match(IDENTIFIER);
				setState(99);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==AS || _la==IDENTIFIER) {
					{
					setState(96);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS) {
						{
						setState(95);
						match(AS);
						}
					}

					setState(98);
					match(IDENTIFIER);
					}
				}

				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(101);
				match(STAR);
				setState(106);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==AS || _la==IDENTIFIER) {
					{
					setState(103);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS) {
						{
						setState(102);
						match(AS);
						}
					}

					setState(105);
					match(IDENTIFIER);
					}
				}

				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(108);
				match(IDENTIFIER);
				setState(109);
				match(DOT);
				setState(110);
				match(IDENTIFIER);
				setState(115);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==AS || _la==IDENTIFIER) {
					{
					setState(112);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS) {
						{
						setState(111);
						match(AS);
						}
					}

					setState(114);
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
	public static class RelListContext extends ParserRuleContext {
		public List<RelationContext> relation() {
			return getRuleContexts(RelationContext.class);
		}
		public RelationContext relation(int i) {
			return getRuleContext(RelationContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(SqlExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(SqlExpressionParser.COMMA, i);
		}
		public RelListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_relList; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterRelList(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitRelList(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitRelList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final RelListContext relList() throws RecognitionException {
		RelListContext _localctx = new RelListContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_relList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(119);
			relation();
			setState(124);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(120);
				match(COMMA);
				setState(121);
				relation();
				}
				}
				setState(126);
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
	public static class RelationContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(SqlExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(SqlExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode AS() { return getToken(SqlExpressionParser.AS, 0); }
		public TerminalNode LPAREN() { return getToken(SqlExpressionParser.LPAREN, 0); }
		public SelectSqlContext selectSql() {
			return getRuleContext(SelectSqlContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(SqlExpressionParser.RPAREN, 0); }
		public RelationContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_relation; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterRelation(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitRelation(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitRelation(this);
			else return visitor.visitChildren(this);
		}
	}

	public final RelationContext relation() throws RecognitionException {
		RelationContext _localctx = new RelationContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_relation);
		int _la;
		try {
			setState(140);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case IDENTIFIER:
				enterOuterAlt(_localctx, 1);
				{
				setState(127);
				match(IDENTIFIER);
				setState(132);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==AS || _la==IDENTIFIER) {
					{
					setState(129);
					_errHandler.sync(this);
					_la = _input.LA(1);
					if (_la==AS) {
						{
						setState(128);
						match(AS);
						}
					}

					setState(131);
					match(IDENTIFIER);
					}
				}

				}
				break;
			case LPAREN:
				enterOuterAlt(_localctx, 2);
				{
				setState(134);
				match(LPAREN);
				setState(135);
				selectSql();
				setState(136);
				match(RPAREN);
				setState(137);
				match(AS);
				setState(138);
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
		public ConditionContext condition() {
			return getRuleContext(ConditionContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(SqlExpressionParser.LPAREN, 0); }
		public List<ConditionListContext> conditionList() {
			return getRuleContexts(ConditionListContext.class);
		}
		public ConditionListContext conditionList(int i) {
			return getRuleContext(ConditionListContext.class,i);
		}
		public TerminalNode RPAREN() { return getToken(SqlExpressionParser.RPAREN, 0); }
		public TerminalNode AND() { return getToken(SqlExpressionParser.AND, 0); }
		public TerminalNode OR() { return getToken(SqlExpressionParser.OR, 0); }
		public ConditionListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_conditionList; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterConditionList(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitConditionList(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitConditionList(this);
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
		int _startState = 14;
		enterRecursionRule(_localctx, 14, RULE_conditionList, _p);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(148);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,20,_ctx) ) {
			case 1:
				{
				setState(143);
				condition();
				}
				break;
			case 2:
				{
				setState(144);
				match(LPAREN);
				setState(145);
				conditionList(0);
				setState(146);
				match(RPAREN);
				}
				break;
			}
			_ctx.stop = _input.LT(-1);
			setState(158);
			_errHandler.sync(this);
			_alt = getInterpreter().adaptivePredict(_input,22,_ctx);
			while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
				if ( _alt==1 ) {
					if ( _parseListeners!=null ) triggerExitRuleEvent();
					_prevctx = _localctx;
					{
					setState(156);
					_errHandler.sync(this);
					switch ( getInterpreter().adaptivePredict(_input,21,_ctx) ) {
					case 1:
						{
						_localctx = new ConditionListContext(_parentctx, _parentState);
						pushNewRecursionContext(_localctx, _startState, RULE_conditionList);
						setState(150);
						if (!(precpred(_ctx, 3))) throw new FailedPredicateException(this, "precpred(_ctx, 3)");
						setState(151);
						match(AND);
						setState(152);
						conditionList(4);
						}
						break;
					case 2:
						{
						_localctx = new ConditionListContext(_parentctx, _parentState);
						pushNewRecursionContext(_localctx, _startState, RULE_conditionList);
						setState(153);
						if (!(precpred(_ctx, 2))) throw new FailedPredicateException(this, "precpred(_ctx, 2)");
						setState(154);
						match(OR);
						setState(155);
						conditionList(3);
						}
						break;
					}
					} 
				}
				setState(160);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,22,_ctx);
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
	public static class CompOpContext extends ParserRuleContext {
		public TerminalNode EQ() { return getToken(SqlExpressionParser.EQ, 0); }
		public TerminalNode LT() { return getToken(SqlExpressionParser.LT, 0); }
		public TerminalNode GT() { return getToken(SqlExpressionParser.GT, 0); }
		public TerminalNode LE() { return getToken(SqlExpressionParser.LE, 0); }
		public TerminalNode GE() { return getToken(SqlExpressionParser.GE, 0); }
		public TerminalNode NE() { return getToken(SqlExpressionParser.NE, 0); }
		public TerminalNode LIKE() { return getToken(SqlExpressionParser.LIKE, 0); }
		public TerminalNode NOT() { return getToken(SqlExpressionParser.NOT, 0); }
		public TerminalNode IN() { return getToken(SqlExpressionParser.IN, 0); }
		public TerminalNode IS() { return getToken(SqlExpressionParser.IS, 0); }
		public CompOpContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_compOp; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterCompOp(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitCompOp(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitCompOp(this);
			else return visitor.visitChildren(this);
		}
	}

	public final CompOpContext compOp() throws RecognitionException {
		CompOpContext _localctx = new CompOpContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_compOp);
		try {
			setState(176);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,23,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(161);
				match(EQ);
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(162);
				match(LT);
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(163);
				match(GT);
				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(164);
				match(LE);
				}
				break;
			case 5:
				enterOuterAlt(_localctx, 5);
				{
				setState(165);
				match(GE);
				}
				break;
			case 6:
				enterOuterAlt(_localctx, 6);
				{
				setState(166);
				match(NE);
				}
				break;
			case 7:
				enterOuterAlt(_localctx, 7);
				{
				setState(167);
				match(LIKE);
				}
				break;
			case 8:
				enterOuterAlt(_localctx, 8);
				{
				setState(168);
				match(NOT);
				setState(169);
				match(LIKE);
				}
				break;
			case 9:
				enterOuterAlt(_localctx, 9);
				{
				setState(170);
				match(IN);
				}
				break;
			case 10:
				enterOuterAlt(_localctx, 10);
				{
				setState(171);
				match(NOT);
				setState(172);
				match(IN);
				}
				break;
			case 11:
				enterOuterAlt(_localctx, 11);
				{
				setState(173);
				match(IS);
				}
				break;
			case 12:
				enterOuterAlt(_localctx, 12);
				{
				setState(174);
				match(IS);
				setState(175);
				match(NOT);
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
		public List<ConditionUnitContext> conditionUnit() {
			return getRuleContexts(ConditionUnitContext.class);
		}
		public ConditionUnitContext conditionUnit(int i) {
			return getRuleContext(ConditionUnitContext.class,i);
		}
		public CompOpContext compOp() {
			return getRuleContext(CompOpContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(SqlExpressionParser.LPAREN, 0); }
		public ConditionContext condition() {
			return getRuleContext(ConditionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(SqlExpressionParser.RPAREN, 0); }
		public TerminalNode IDENTIFIER() { return getToken(SqlExpressionParser.IDENTIFIER, 0); }
		public TerminalNode BETWEEN() { return getToken(SqlExpressionParser.BETWEEN, 0); }
		public List<NumberContext> number() {
			return getRuleContexts(NumberContext.class);
		}
		public NumberContext number(int i) {
			return getRuleContext(NumberContext.class,i);
		}
		public TerminalNode AND() { return getToken(SqlExpressionParser.AND, 0); }
		public ConditionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_condition; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterCondition(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitCondition(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitCondition(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ConditionContext condition() throws RecognitionException {
		ConditionContext _localctx = new ConditionContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_condition);
		try {
			setState(192);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,24,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(178);
				conditionUnit();
				setState(179);
				compOp();
				setState(180);
				conditionUnit();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(182);
				match(LPAREN);
				setState(183);
				condition();
				setState(184);
				match(RPAREN);
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(186);
				match(IDENTIFIER);
				setState(187);
				match(BETWEEN);
				setState(188);
				number();
				setState(189);
				match(AND);
				setState(190);
				number();
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
	public static class ConditionUnitContext extends ParserRuleContext {
		public NumberContext number() {
			return getRuleContext(NumberContext.class,0);
		}
		public StringContext string() {
			return getRuleContext(StringContext.class,0);
		}
		public List<TerminalNode> IDENTIFIER() { return getTokens(SqlExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(SqlExpressionParser.IDENTIFIER, i);
		}
		public TerminalNode DOT() { return getToken(SqlExpressionParser.DOT, 0); }
		public TerminalNode NULL() { return getToken(SqlExpressionParser.NULL, 0); }
		public TerminalNode LPAREN() { return getToken(SqlExpressionParser.LPAREN, 0); }
		public SelectSqlContext selectSql() {
			return getRuleContext(SelectSqlContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(SqlExpressionParser.RPAREN, 0); }
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public ConditionUnitContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_conditionUnit; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterConditionUnit(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitConditionUnit(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitConditionUnit(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ConditionUnitContext conditionUnit() throws RecognitionException {
		ConditionUnitContext _localctx = new ConditionUnitContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_conditionUnit);
		try {
			setState(206);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,25,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(194);
				number();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(195);
				string();
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(196);
				match(IDENTIFIER);
				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(197);
				match(IDENTIFIER);
				setState(198);
				match(DOT);
				setState(199);
				match(IDENTIFIER);
				}
				break;
			case 5:
				enterOuterAlt(_localctx, 5);
				{
				setState(200);
				match(NULL);
				}
				break;
			case 6:
				enterOuterAlt(_localctx, 6);
				{
				setState(201);
				match(LPAREN);
				setState(202);
				selectSql();
				setState(203);
				match(RPAREN);
				}
				break;
			case 7:
				enterOuterAlt(_localctx, 7);
				{
				setState(205);
				functionCall();
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
	public static class FunctionCallContext extends ParserRuleContext {
		public FunctionNameContext functionName() {
			return getRuleContext(FunctionNameContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(SqlExpressionParser.LPAREN, 0); }
		public ParameterListContext parameterList() {
			return getRuleContext(ParameterListContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(SqlExpressionParser.RPAREN, 0); }
		public FunctionCallContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionCall; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterFunctionCall(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitFunctionCall(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitFunctionCall(this);
			else return visitor.visitChildren(this);
		}
	}

	public final FunctionCallContext functionCall() throws RecognitionException {
		FunctionCallContext _localctx = new FunctionCallContext(_ctx, getState());
		enterRule(_localctx, 22, RULE_functionCall);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(208);
			functionName();
			setState(209);
			match(LPAREN);
			setState(210);
			parameterList();
			setState(211);
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
	public static class FunctionNameContext extends ParserRuleContext {
		public TerminalNode COUNT() { return getToken(SqlExpressionParser.COUNT, 0); }
		public TerminalNode AVG() { return getToken(SqlExpressionParser.AVG, 0); }
		public TerminalNode SUM() { return getToken(SqlExpressionParser.SUM, 0); }
		public TerminalNode MIN() { return getToken(SqlExpressionParser.MIN, 0); }
		public TerminalNode MAX() { return getToken(SqlExpressionParser.MAX, 0); }
		public TerminalNode IDENTIFIER() { return getToken(SqlExpressionParser.IDENTIFIER, 0); }
		public FunctionNameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_functionName; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterFunctionName(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitFunctionName(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitFunctionName(this);
			else return visitor.visitChildren(this);
		}
	}

	public final FunctionNameContext functionName() throws RecognitionException {
		FunctionNameContext _localctx = new FunctionNameContext(_ctx, getState());
		enterRule(_localctx, 24, RULE_functionName);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(213);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 17592316067840L) != 0)) ) {
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
	public static class ParameterListContext extends ParserRuleContext {
		public List<ParameterContext> parameter() {
			return getRuleContexts(ParameterContext.class);
		}
		public ParameterContext parameter(int i) {
			return getRuleContext(ParameterContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(SqlExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(SqlExpressionParser.COMMA, i);
		}
		public ParameterListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_parameterList; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterParameterList(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitParameterList(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitParameterList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ParameterListContext parameterList() throws RecognitionException {
		ParameterListContext _localctx = new ParameterListContext(_ctx, getState());
		enterRule(_localctx, 26, RULE_parameterList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(215);
			parameter();
			setState(220);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(216);
				match(COMMA);
				setState(217);
				parameter();
				}
				}
				setState(222);
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
		public TerminalNode STAR() { return getToken(SqlExpressionParser.STAR, 0); }
		public StringContext string() {
			return getRuleContext(StringContext.class,0);
		}
		public ParameterContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_parameter; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterParameter(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitParameter(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitParameter(this);
			else return visitor.visitChildren(this);
		}
	}

	public final ParameterContext parameter() throws RecognitionException {
		ParameterContext _localctx = new ParameterContext(_ctx, getState());
		enterRule(_localctx, 28, RULE_parameter);
		try {
			setState(225);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case STAR:
				enterOuterAlt(_localctx, 1);
				{
				setState(223);
				match(STAR);
				}
				break;
			case STRING:
				enterOuterAlt(_localctx, 2);
				{
				setState(224);
				string();
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
	public static class GroupByListContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(SqlExpressionParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(SqlExpressionParser.IDENTIFIER, i);
		}
		public List<TerminalNode> COMMA() { return getTokens(SqlExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(SqlExpressionParser.COMMA, i);
		}
		public GroupByListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_groupByList; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterGroupByList(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitGroupByList(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitGroupByList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final GroupByListContext groupByList() throws RecognitionException {
		GroupByListContext _localctx = new GroupByListContext(_ctx, getState());
		enterRule(_localctx, 30, RULE_groupByList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(227);
			match(IDENTIFIER);
			setState(232);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(228);
				match(COMMA);
				setState(229);
				match(IDENTIFIER);
				}
				}
				setState(234);
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
	public static class OrderByListContext extends ParserRuleContext {
		public List<OrderByFieldContext> orderByField() {
			return getRuleContexts(OrderByFieldContext.class);
		}
		public OrderByFieldContext orderByField(int i) {
			return getRuleContext(OrderByFieldContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(SqlExpressionParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(SqlExpressionParser.COMMA, i);
		}
		public OrderByListContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_orderByList; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterOrderByList(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitOrderByList(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitOrderByList(this);
			else return visitor.visitChildren(this);
		}
	}

	public final OrderByListContext orderByList() throws RecognitionException {
		OrderByListContext _localctx = new OrderByListContext(_ctx, getState());
		enterRule(_localctx, 32, RULE_orderByList);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(235);
			orderByField();
			setState(240);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(236);
				match(COMMA);
				setState(237);
				orderByField();
				}
				}
				setState(242);
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
	public static class OrderByFieldContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(SqlExpressionParser.IDENTIFIER, 0); }
		public TerminalNode ASC() { return getToken(SqlExpressionParser.ASC, 0); }
		public TerminalNode DESC() { return getToken(SqlExpressionParser.DESC, 0); }
		public FunctionCallContext functionCall() {
			return getRuleContext(FunctionCallContext.class,0);
		}
		public OrderByFieldContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_orderByField; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterOrderByField(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitOrderByField(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitOrderByField(this);
			else return visitor.visitChildren(this);
		}
	}

	public final OrderByFieldContext orderByField() throws RecognitionException {
		OrderByFieldContext _localctx = new OrderByFieldContext(_ctx, getState());
		enterRule(_localctx, 34, RULE_orderByField);
		int _la;
		try {
			setState(251);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,32,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(243);
				match(IDENTIFIER);
				setState(245);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==ASC || _la==DESC) {
					{
					setState(244);
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
				}

				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(247);
				functionCall();
				setState(249);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==ASC || _la==DESC) {
					{
					setState(248);
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
	public static class LimitClauseContext extends ParserRuleContext {
		public TerminalNode NUMBER() { return getToken(SqlExpressionParser.NUMBER, 0); }
		public LimitClauseContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_limitClause; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterLimitClause(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitLimitClause(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitLimitClause(this);
			else return visitor.visitChildren(this);
		}
	}

	public final LimitClauseContext limitClause() throws RecognitionException {
		LimitClauseContext _localctx = new LimitClauseContext(_ctx, getState());
		enterRule(_localctx, 36, RULE_limitClause);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(253);
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
	public static class NumberContext extends ParserRuleContext {
		public TerminalNode NUMBER() { return getToken(SqlExpressionParser.NUMBER, 0); }
		public TerminalNode FLOAT() { return getToken(SqlExpressionParser.FLOAT, 0); }
		public NumberContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_number; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterNumber(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitNumber(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitNumber(this);
			else return visitor.visitChildren(this);
		}
	}

	public final NumberContext number() throws RecognitionException {
		NumberContext _localctx = new NumberContext(_ctx, getState());
		enterRule(_localctx, 38, RULE_number);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(255);
			_la = _input.LA(1);
			if ( !(_la==FLOAT || _la==NUMBER) ) {
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
		public TerminalNode STRING() { return getToken(SqlExpressionParser.STRING, 0); }
		public StringContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_string; }
		@Override
		public void enterRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).enterString(this);
		}
		@Override
		public void exitRule(ParseTreeListener listener) {
			if ( listener instanceof SqlExpressionListener ) ((SqlExpressionListener)listener).exitString(this);
		}
		@Override
		public <T> T accept(ParseTreeVisitor<? extends T> visitor) {
			if ( visitor instanceof SqlExpressionVisitor ) return ((SqlExpressionVisitor<? extends T>)visitor).visitString(this);
			else return visitor.visitChildren(this);
		}
	}

	public final StringContext string() throws RecognitionException {
		StringContext _localctx = new StringContext(_ctx, getState());
		enterRule(_localctx, 40, RULE_string);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(257);
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

	public boolean sempred(RuleContext _localctx, int ruleIndex, int predIndex) {
		switch (ruleIndex) {
		case 7:
			return conditionList_sempred((ConditionListContext)_localctx, predIndex);
		}
		return true;
	}
	private boolean conditionList_sempred(ConditionListContext _localctx, int predIndex) {
		switch (predIndex) {
		case 0:
			return precpred(_ctx, 3);
		case 1:
			return precpred(_ctx, 2);
		}
		return true;
	}

	public static final String _serializedATN =
		"\u0004\u0001/\u0104\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002"+
		"\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002"+
		"\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007\u0007\u0007\u0002"+
		"\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b\u0007\u000b\u0002"+
		"\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002\u000f\u0007\u000f"+
		"\u0002\u0010\u0007\u0010\u0002\u0011\u0007\u0011\u0002\u0012\u0007\u0012"+
		"\u0002\u0013\u0007\u0013\u0002\u0014\u0007\u0014\u0001\u0000\u0001\u0000"+
		"\u0001\u0000\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001"+
		"\u0001\u0001\u0003\u00014\b\u0001\u0001\u0002\u0001\u0002\u0001\u0002"+
		"\u0001\u0002\u0001\u0002\u0001\u0002\u0003\u0002<\b\u0002\u0001\u0002"+
		"\u0001\u0002\u0001\u0002\u0003\u0002A\b\u0002\u0001\u0002\u0001\u0002"+
		"\u0003\u0002E\b\u0002\u0001\u0002\u0001\u0002\u0001\u0002\u0003\u0002"+
		"J\b\u0002\u0001\u0002\u0001\u0002\u0003\u0002N\b\u0002\u0001\u0003\u0001"+
		"\u0003\u0001\u0003\u0005\u0003S\b\u0003\n\u0003\f\u0003V\t\u0003\u0001"+
		"\u0004\u0001\u0004\u0003\u0004Z\b\u0004\u0001\u0004\u0003\u0004]\b\u0004"+
		"\u0001\u0004\u0001\u0004\u0003\u0004a\b\u0004\u0001\u0004\u0003\u0004"+
		"d\b\u0004\u0001\u0004\u0001\u0004\u0003\u0004h\b\u0004\u0001\u0004\u0003"+
		"\u0004k\b\u0004\u0001\u0004\u0001\u0004\u0001\u0004\u0001\u0004\u0003"+
		"\u0004q\b\u0004\u0001\u0004\u0003\u0004t\b\u0004\u0003\u0004v\b\u0004"+
		"\u0001\u0005\u0001\u0005\u0001\u0005\u0005\u0005{\b\u0005\n\u0005\f\u0005"+
		"~\t\u0005\u0001\u0006\u0001\u0006\u0003\u0006\u0082\b\u0006\u0001\u0006"+
		"\u0003\u0006\u0085\b\u0006\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0006"+
		"\u0001\u0006\u0001\u0006\u0003\u0006\u008d\b\u0006\u0001\u0007\u0001\u0007"+
		"\u0001\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0003\u0007\u0095\b\u0007"+
		"\u0001\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0001\u0007\u0001\u0007"+
		"\u0005\u0007\u009d\b\u0007\n\u0007\f\u0007\u00a0\t\u0007\u0001\b\u0001"+
		"\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001\b\u0001"+
		"\b\u0001\b\u0001\b\u0001\b\u0001\b\u0003\b\u00b1\b\b\u0001\t\u0001\t\u0001"+
		"\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001"+
		"\t\u0001\t\u0001\t\u0003\t\u00c1\b\t\u0001\n\u0001\n\u0001\n\u0001\n\u0001"+
		"\n\u0001\n\u0001\n\u0001\n\u0001\n\u0001\n\u0001\n\u0001\n\u0003\n\u00cf"+
		"\b\n\u0001\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001"+
		"\f\u0001\f\u0001\r\u0001\r\u0001\r\u0005\r\u00db\b\r\n\r\f\r\u00de\t\r"+
		"\u0001\u000e\u0001\u000e\u0003\u000e\u00e2\b\u000e\u0001\u000f\u0001\u000f"+
		"\u0001\u000f\u0005\u000f\u00e7\b\u000f\n\u000f\f\u000f\u00ea\t\u000f\u0001"+
		"\u0010\u0001\u0010\u0001\u0010\u0005\u0010\u00ef\b\u0010\n\u0010\f\u0010"+
		"\u00f2\t\u0010\u0001\u0011\u0001\u0011\u0003\u0011\u00f6\b\u0011\u0001"+
		"\u0011\u0001\u0011\u0003\u0011\u00fa\b\u0011\u0003\u0011\u00fc\b\u0011"+
		"\u0001\u0012\u0001\u0012\u0001\u0013\u0001\u0013\u0001\u0014\u0001\u0014"+
		"\u0001\u0014\u0000\u0001\u000e\u0015\u0000\u0002\u0004\u0006\b\n\f\u000e"+
		"\u0010\u0012\u0014\u0016\u0018\u001a\u001c\u001e \"$&(\u0000\u0003\u0002"+
		"\u0000\u0016\u001a,,\u0001\u0000\u000e\u000f\u0001\u0000)*\u0121\u0000"+
		"*\u0001\u0000\u0000\u0000\u00023\u0001\u0000\u0000\u0000\u00045\u0001"+
		"\u0000\u0000\u0000\u0006O\u0001\u0000\u0000\u0000\bu\u0001\u0000\u0000"+
		"\u0000\nw\u0001\u0000\u0000\u0000\f\u008c\u0001\u0000\u0000\u0000\u000e"+
		"\u0094\u0001\u0000\u0000\u0000\u0010\u00b0\u0001\u0000\u0000\u0000\u0012"+
		"\u00c0\u0001\u0000\u0000\u0000\u0014\u00ce\u0001\u0000\u0000\u0000\u0016"+
		"\u00d0\u0001\u0000\u0000\u0000\u0018\u00d5\u0001\u0000\u0000\u0000\u001a"+
		"\u00d7\u0001\u0000\u0000\u0000\u001c\u00e1\u0001\u0000\u0000\u0000\u001e"+
		"\u00e3\u0001\u0000\u0000\u0000 \u00eb\u0001\u0000\u0000\u0000\"\u00fb"+
		"\u0001\u0000\u0000\u0000$\u00fd\u0001\u0000\u0000\u0000&\u00ff\u0001\u0000"+
		"\u0000\u0000(\u0101\u0001\u0000\u0000\u0000*+\u0003\u0002\u0001\u0000"+
		"+,\u0005\u0000\u0000\u0001,\u0001\u0001\u0000\u0000\u0000-4\u0003\u0004"+
		"\u0002\u0000./\u0005\u001b\u0000\u0000/0\u0005\"\u0000\u000001\u0003("+
		"\u0014\u000012\u0005#\u0000\u000024\u0001\u0000\u0000\u00003-\u0001\u0000"+
		"\u0000\u00003.\u0001\u0000\u0000\u00004\u0003\u0001\u0000\u0000\u0000"+
		"56\u0005\u0004\u0000\u000067\u0003\u0006\u0003\u000078\u0005\u0005\u0000"+
		"\u00008;\u0003\n\u0005\u00009:\u0005\u0006\u0000\u0000:<\u0003\u000e\u0007"+
		"\u0000;9\u0001\u0000\u0000\u0000;<\u0001\u0000\u0000\u0000<@\u0001\u0000"+
		"\u0000\u0000=>\u0005\u0007\u0000\u0000>?\u0005\b\u0000\u0000?A\u0003\u001e"+
		"\u000f\u0000@=\u0001\u0000\u0000\u0000@A\u0001\u0000\u0000\u0000AD\u0001"+
		"\u0000\u0000\u0000BC\u0005\t\u0000\u0000CE\u0003\u000e\u0007\u0000DB\u0001"+
		"\u0000\u0000\u0000DE\u0001\u0000\u0000\u0000EI\u0001\u0000\u0000\u0000"+
		"FG\u0005\n\u0000\u0000GH\u0005\b\u0000\u0000HJ\u0003 \u0010\u0000IF\u0001"+
		"\u0000\u0000\u0000IJ\u0001\u0000\u0000\u0000JM\u0001\u0000\u0000\u0000"+
		"KL\u0005\u000b\u0000\u0000LN\u0003$\u0012\u0000MK\u0001\u0000\u0000\u0000"+
		"MN\u0001\u0000\u0000\u0000N\u0005\u0001\u0000\u0000\u0000OT\u0003\b\u0004"+
		"\u0000PQ\u0005&\u0000\u0000QS\u0003\b\u0004\u0000RP\u0001\u0000\u0000"+
		"\u0000SV\u0001\u0000\u0000\u0000TR\u0001\u0000\u0000\u0000TU\u0001\u0000"+
		"\u0000\u0000U\u0007\u0001\u0000\u0000\u0000VT\u0001\u0000\u0000\u0000"+
		"W\\\u0003\u0016\u000b\u0000XZ\u0005\r\u0000\u0000YX\u0001\u0000\u0000"+
		"\u0000YZ\u0001\u0000\u0000\u0000Z[\u0001\u0000\u0000\u0000[]\u0005,\u0000"+
		"\u0000\\Y\u0001\u0000\u0000\u0000\\]\u0001\u0000\u0000\u0000]v\u0001\u0000"+
		"\u0000\u0000^c\u0005,\u0000\u0000_a\u0005\r\u0000\u0000`_\u0001\u0000"+
		"\u0000\u0000`a\u0001\u0000\u0000\u0000ab\u0001\u0000\u0000\u0000bd\u0005"+
		",\u0000\u0000c`\u0001\u0000\u0000\u0000cd\u0001\u0000\u0000\u0000dv\u0001"+
		"\u0000\u0000\u0000ej\u0005\u0015\u0000\u0000fh\u0005\r\u0000\u0000gf\u0001"+
		"\u0000\u0000\u0000gh\u0001\u0000\u0000\u0000hi\u0001\u0000\u0000\u0000"+
		"ik\u0005,\u0000\u0000jg\u0001\u0000\u0000\u0000jk\u0001\u0000\u0000\u0000"+
		"kv\u0001\u0000\u0000\u0000lm\u0005,\u0000\u0000mn\u0005\'\u0000\u0000"+
		"ns\u0005,\u0000\u0000oq\u0005\r\u0000\u0000po\u0001\u0000\u0000\u0000"+
		"pq\u0001\u0000\u0000\u0000qr\u0001\u0000\u0000\u0000rt\u0005,\u0000\u0000"+
		"sp\u0001\u0000\u0000\u0000st\u0001\u0000\u0000\u0000tv\u0001\u0000\u0000"+
		"\u0000uW\u0001\u0000\u0000\u0000u^\u0001\u0000\u0000\u0000ue\u0001\u0000"+
		"\u0000\u0000ul\u0001\u0000\u0000\u0000v\t\u0001\u0000\u0000\u0000w|\u0003"+
		"\f\u0006\u0000xy\u0005&\u0000\u0000y{\u0003\f\u0006\u0000zx\u0001\u0000"+
		"\u0000\u0000{~\u0001\u0000\u0000\u0000|z\u0001\u0000\u0000\u0000|}\u0001"+
		"\u0000\u0000\u0000}\u000b\u0001\u0000\u0000\u0000~|\u0001\u0000\u0000"+
		"\u0000\u007f\u0084\u0005,\u0000\u0000\u0080\u0082\u0005\r\u0000\u0000"+
		"\u0081\u0080\u0001\u0000\u0000\u0000\u0081\u0082\u0001\u0000\u0000\u0000"+
		"\u0082\u0083\u0001\u0000\u0000\u0000\u0083\u0085\u0005,\u0000\u0000\u0084"+
		"\u0081\u0001\u0000\u0000\u0000\u0084\u0085\u0001\u0000\u0000\u0000\u0085"+
		"\u008d\u0001\u0000\u0000\u0000\u0086\u0087\u0005\"\u0000\u0000\u0087\u0088"+
		"\u0003\u0004\u0002\u0000\u0088\u0089\u0005#\u0000\u0000\u0089\u008a\u0005"+
		"\r\u0000\u0000\u008a\u008b\u0005,\u0000\u0000\u008b\u008d\u0001\u0000"+
		"\u0000\u0000\u008c\u007f\u0001\u0000\u0000\u0000\u008c\u0086\u0001\u0000"+
		"\u0000\u0000\u008d\r\u0001\u0000\u0000\u0000\u008e\u008f\u0006\u0007\uffff"+
		"\uffff\u0000\u008f\u0095\u0003\u0012\t\u0000\u0090\u0091\u0005\"\u0000"+
		"\u0000\u0091\u0092\u0003\u000e\u0007\u0000\u0092\u0093\u0005#\u0000\u0000"+
		"\u0093\u0095\u0001\u0000\u0000\u0000\u0094\u008e\u0001\u0000\u0000\u0000"+
		"\u0094\u0090\u0001\u0000\u0000\u0000\u0095\u009e\u0001\u0000\u0000\u0000"+
		"\u0096\u0097\n\u0003\u0000\u0000\u0097\u0098\u0005\u0001\u0000\u0000\u0098"+
		"\u009d\u0003\u000e\u0007\u0004\u0099\u009a\n\u0002\u0000\u0000\u009a\u009b"+
		"\u0005\u0002\u0000\u0000\u009b\u009d\u0003\u000e\u0007\u0003\u009c\u0096"+
		"\u0001\u0000\u0000\u0000\u009c\u0099\u0001\u0000\u0000\u0000\u009d\u00a0"+
		"\u0001\u0000\u0000\u0000\u009e\u009c\u0001\u0000\u0000\u0000\u009e\u009f"+
		"\u0001\u0000\u0000\u0000\u009f\u000f\u0001\u0000\u0000\u0000\u00a0\u009e"+
		"\u0001\u0000\u0000\u0000\u00a1\u00b1\u0005 \u0000\u0000\u00a2\u00b1\u0005"+
		"\u001e\u0000\u0000\u00a3\u00b1\u0005\u001c\u0000\u0000\u00a4\u00b1\u0005"+
		"\u001f\u0000\u0000\u00a5\u00b1\u0005\u001d\u0000\u0000\u00a6\u00b1\u0005"+
		"!\u0000\u0000\u00a7\u00b1\u0005\u0013\u0000\u0000\u00a8\u00a9\u0005\u0003"+
		"\u0000\u0000\u00a9\u00b1\u0005\u0013\u0000\u0000\u00aa\u00b1\u0005\u0010"+
		"\u0000\u0000\u00ab\u00ac\u0005\u0003\u0000\u0000\u00ac\u00b1\u0005\u0010"+
		"\u0000\u0000\u00ad\u00b1\u0005\u0011\u0000\u0000\u00ae\u00af\u0005\u0011"+
		"\u0000\u0000\u00af\u00b1\u0005\u0003\u0000\u0000\u00b0\u00a1\u0001\u0000"+
		"\u0000\u0000\u00b0\u00a2\u0001\u0000\u0000\u0000\u00b0\u00a3\u0001\u0000"+
		"\u0000\u0000\u00b0\u00a4\u0001\u0000\u0000\u0000\u00b0\u00a5\u0001\u0000"+
		"\u0000\u0000\u00b0\u00a6\u0001\u0000\u0000\u0000\u00b0\u00a7\u0001\u0000"+
		"\u0000\u0000\u00b0\u00a8\u0001\u0000\u0000\u0000\u00b0\u00aa\u0001\u0000"+
		"\u0000\u0000\u00b0\u00ab\u0001\u0000\u0000\u0000\u00b0\u00ad\u0001\u0000"+
		"\u0000\u0000\u00b0\u00ae\u0001\u0000\u0000\u0000\u00b1\u0011\u0001\u0000"+
		"\u0000\u0000\u00b2\u00b3\u0003\u0014\n\u0000\u00b3\u00b4\u0003\u0010\b"+
		"\u0000\u00b4\u00b5\u0003\u0014\n\u0000\u00b5\u00c1\u0001\u0000\u0000\u0000"+
		"\u00b6\u00b7\u0005\"\u0000\u0000\u00b7\u00b8\u0003\u0012\t\u0000\u00b8"+
		"\u00b9\u0005#\u0000\u0000\u00b9\u00c1\u0001\u0000\u0000\u0000\u00ba\u00bb"+
		"\u0005,\u0000\u0000\u00bb\u00bc\u0005\u0014\u0000\u0000\u00bc\u00bd\u0003"+
		"&\u0013\u0000\u00bd\u00be\u0005\u0001\u0000\u0000\u00be\u00bf\u0003&\u0013"+
		"\u0000\u00bf\u00c1\u0001\u0000\u0000\u0000\u00c0\u00b2\u0001\u0000\u0000"+
		"\u0000\u00c0\u00b6\u0001\u0000\u0000\u0000\u00c0\u00ba\u0001\u0000\u0000"+
		"\u0000\u00c1\u0013\u0001\u0000\u0000\u0000\u00c2\u00cf\u0003&\u0013\u0000"+
		"\u00c3\u00cf\u0003(\u0014\u0000\u00c4\u00cf\u0005,\u0000\u0000\u00c5\u00c6"+
		"\u0005,\u0000\u0000\u00c6\u00c7\u0005\'\u0000\u0000\u00c7\u00cf\u0005"+
		",\u0000\u0000\u00c8\u00cf\u0005\u0012\u0000\u0000\u00c9\u00ca\u0005\""+
		"\u0000\u0000\u00ca\u00cb\u0003\u0004\u0002\u0000\u00cb\u00cc\u0005#\u0000"+
		"\u0000\u00cc\u00cf\u0001\u0000\u0000\u0000\u00cd\u00cf\u0003\u0016\u000b"+
		"\u0000\u00ce\u00c2\u0001\u0000\u0000\u0000\u00ce\u00c3\u0001\u0000\u0000"+
		"\u0000\u00ce\u00c4\u0001\u0000\u0000\u0000\u00ce\u00c5\u0001\u0000\u0000"+
		"\u0000\u00ce\u00c8\u0001\u0000\u0000\u0000\u00ce\u00c9\u0001\u0000\u0000"+
		"\u0000\u00ce\u00cd\u0001\u0000\u0000\u0000\u00cf\u0015\u0001\u0000\u0000"+
		"\u0000\u00d0\u00d1\u0003\u0018\f\u0000\u00d1\u00d2\u0005\"\u0000\u0000"+
		"\u00d2\u00d3\u0003\u001a\r\u0000\u00d3\u00d4\u0005#\u0000\u0000\u00d4"+
		"\u0017\u0001\u0000\u0000\u0000\u00d5\u00d6\u0007\u0000\u0000\u0000\u00d6"+
		"\u0019\u0001\u0000\u0000\u0000\u00d7\u00dc\u0003\u001c\u000e\u0000\u00d8"+
		"\u00d9\u0005&\u0000\u0000\u00d9\u00db\u0003\u001c\u000e\u0000\u00da\u00d8"+
		"\u0001\u0000\u0000\u0000\u00db\u00de\u0001\u0000\u0000\u0000\u00dc\u00da"+
		"\u0001\u0000\u0000\u0000\u00dc\u00dd\u0001\u0000\u0000\u0000\u00dd\u001b"+
		"\u0001\u0000\u0000\u0000\u00de\u00dc\u0001\u0000\u0000\u0000\u00df\u00e2"+
		"\u0005\u0015\u0000\u0000\u00e0\u00e2\u0003(\u0014\u0000\u00e1\u00df\u0001"+
		"\u0000\u0000\u0000\u00e1\u00e0\u0001\u0000\u0000\u0000\u00e2\u001d\u0001"+
		"\u0000\u0000\u0000\u00e3\u00e8\u0005,\u0000\u0000\u00e4\u00e5\u0005&\u0000"+
		"\u0000\u00e5\u00e7\u0005,\u0000\u0000\u00e6\u00e4\u0001\u0000\u0000\u0000"+
		"\u00e7\u00ea\u0001\u0000\u0000\u0000\u00e8\u00e6\u0001\u0000\u0000\u0000"+
		"\u00e8\u00e9\u0001\u0000\u0000\u0000\u00e9\u001f\u0001\u0000\u0000\u0000"+
		"\u00ea\u00e8\u0001\u0000\u0000\u0000\u00eb\u00f0\u0003\"\u0011\u0000\u00ec"+
		"\u00ed\u0005&\u0000\u0000\u00ed\u00ef\u0003\"\u0011\u0000\u00ee\u00ec"+
		"\u0001\u0000\u0000\u0000\u00ef\u00f2\u0001\u0000\u0000\u0000\u00f0\u00ee"+
		"\u0001\u0000\u0000\u0000\u00f0\u00f1\u0001\u0000\u0000\u0000\u00f1!\u0001"+
		"\u0000\u0000\u0000\u00f2\u00f0\u0001\u0000\u0000\u0000\u00f3\u00f5\u0005"+
		",\u0000\u0000\u00f4\u00f6\u0007\u0001\u0000\u0000\u00f5\u00f4\u0001\u0000"+
		"\u0000\u0000\u00f5\u00f6\u0001\u0000\u0000\u0000\u00f6\u00fc\u0001\u0000"+
		"\u0000\u0000\u00f7\u00f9\u0003\u0016\u000b\u0000\u00f8\u00fa\u0007\u0001"+
		"\u0000\u0000\u00f9\u00f8\u0001\u0000\u0000\u0000\u00f9\u00fa\u0001\u0000"+
		"\u0000\u0000\u00fa\u00fc\u0001\u0000\u0000\u0000\u00fb\u00f3\u0001\u0000"+
		"\u0000\u0000\u00fb\u00f7\u0001\u0000\u0000\u0000\u00fc#\u0001\u0000\u0000"+
		"\u0000\u00fd\u00fe\u0005*\u0000\u0000\u00fe%\u0001\u0000\u0000\u0000\u00ff"+
		"\u0100\u0007\u0002\u0000\u0000\u0100\'\u0001\u0000\u0000\u0000\u0101\u0102"+
		"\u0005+\u0000\u0000\u0102)\u0001\u0000\u0000\u0000!3;@DIMTY\\`cgjpsu|"+
		"\u0081\u0084\u008c\u0094\u009c\u009e\u00b0\u00c0\u00ce\u00dc\u00e1\u00e8"+
		"\u00f0\u00f5\u00f9\u00fb";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}