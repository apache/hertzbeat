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

import org.antlr.v4.runtime.CharStream;
import org.antlr.v4.runtime.Lexer;
import org.antlr.v4.runtime.RuntimeMetaData;
import org.antlr.v4.runtime.Vocabulary;
import org.antlr.v4.runtime.VocabularyImpl;
import org.antlr.v4.runtime.atn.ATN;
import org.antlr.v4.runtime.atn.ATNDeserializer;
import org.antlr.v4.runtime.atn.LexerATNSimulator;
import org.antlr.v4.runtime.atn.PredictionContextCache;
import org.antlr.v4.runtime.dfa.DFA;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue", "this-escape"})
public class AlertExpressionLexer extends Lexer {
	static { RuntimeMetaData.checkVersion("4.13.2", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
			new PredictionContextCache();
	public static final int
			AND=1, OR=2, UNLESS=3, GT=4, GE=5, LT=6, LE=7, EQ=8, NE=9, LPAREN=10,
			RPAREN=11, SCRIPT_FUNCTION=12, IDENTIFIER=13, STRING=14, NUMBER=15, WS=16;
	public static String[] channelNames = {
			"DEFAULT_TOKEN_CHANNEL", "HIDDEN"
	};

	public static String[] modeNames = {
			"DEFAULT_MODE"
	};

	private static String[] makeRuleNames() {
		return new String[] {
				"AND", "OR", "UNLESS", "GT", "GE", "LT", "LE", "EQ", "NE", "LPAREN",
				"RPAREN", "SCRIPT_FUNCTION", "IDENTIFIER", "STRING", "NUMBER", "WS"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
				null, "'and'", "'or'", "'unless'", "'>'", "'>='", "'<'", "'<='", "'=='",
				"'!='", "'('", "')'", "'__script__'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
				null, "AND", "OR", "UNLESS", "GT", "GE", "LT", "LE", "EQ", "NE", "LPAREN",
				"RPAREN", "SCRIPT_FUNCTION", "IDENTIFIER", "STRING", "NUMBER", "WS"
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


	public AlertExpressionLexer(CharStream input) {
		super(input);
		_interp = new LexerATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@Override
	public String getGrammarFileName() { return "AlertExpression.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public String[] getChannelNames() { return channelNames; }

	@Override
	public String[] getModeNames() { return modeNames; }

	@Override
	public ATN getATN() { return _ATN; }

	public static final String _serializedATN =
			"\u0004\u0000\u0010{\u0006\uffff\uffff\u0002\u0000\u0007\u0000\u0002\u0001"+
					"\u0007\u0001\u0002\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004"+
					"\u0007\u0004\u0002\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007"+
					"\u0007\u0007\u0002\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b"+
					"\u0007\u000b\u0002\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002"+
					"\u000f\u0007\u000f\u0001\u0000\u0001\u0000\u0001\u0000\u0001\u0000\u0001"+
					"\u0001\u0001\u0001\u0001\u0001\u0001\u0002\u0001\u0002\u0001\u0002\u0001"+
					"\u0002\u0001\u0002\u0001\u0002\u0001\u0002\u0001\u0003\u0001\u0003\u0001"+
					"\u0004\u0001\u0004\u0001\u0004\u0001\u0005\u0001\u0005\u0001\u0006\u0001"+
					"\u0006\u0001\u0006\u0001\u0007\u0001\u0007\u0001\u0007\u0001\b\u0001\b"+
					"\u0001\b\u0001\t\u0001\t\u0001\n\u0001\n\u0001\u000b\u0001\u000b\u0001"+
					"\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001\u000b\u0001"+
					"\u000b\u0001\u000b\u0001\u000b\u0001\f\u0001\f\u0005\fQ\b\f\n\f\f\fT\t"+
					"\f\u0001\r\u0001\r\u0005\rX\b\r\n\r\f\r[\t\r\u0001\r\u0001\r\u0001\r\u0005"+
					"\r`\b\r\n\r\f\rc\t\r\u0001\r\u0003\rf\b\r\u0001\u000e\u0004\u000ei\b\u000e"+
					"\u000b\u000e\f\u000ej\u0001\u000e\u0001\u000e\u0004\u000eo\b\u000e\u000b"+
					"\u000e\f\u000ep\u0003\u000es\b\u000e\u0001\u000f\u0004\u000fv\b\u000f"+
					"\u000b\u000f\f\u000fw\u0001\u000f\u0001\u000f\u0000\u0000\u0010\u0001"+
					"\u0001\u0003\u0002\u0005\u0003\u0007\u0004\t\u0005\u000b\u0006\r\u0007"+
					"\u000f\b\u0011\t\u0013\n\u0015\u000b\u0017\f\u0019\r\u001b\u000e\u001d"+
					"\u000f\u001f\u0010\u0001\u0000\u0006\u0003\u0000AZ__az\n\u0000\"\"..0"+
					"9==A[]]__a{}}\u8000\uff5e\u8000\uff5e\u0003\u0000\n\n\r\r\"\"\u0003\u0000"+
					"\n\n\r\r\'\'\u0001\u000009\u0003\u0000\t\n\r\r  \u0082\u0000\u0001\u0001"+
					"\u0000\u0000\u0000\u0000\u0003\u0001\u0000\u0000\u0000\u0000\u0005\u0001"+
					"\u0000\u0000\u0000\u0000\u0007\u0001\u0000\u0000\u0000\u0000\t\u0001\u0000"+
					"\u0000\u0000\u0000\u000b\u0001\u0000\u0000\u0000\u0000\r\u0001\u0000\u0000"+
					"\u0000\u0000\u000f\u0001\u0000\u0000\u0000\u0000\u0011\u0001\u0000\u0000"+
					"\u0000\u0000\u0013\u0001\u0000\u0000\u0000\u0000\u0015\u0001\u0000\u0000"+
					"\u0000\u0000\u0017\u0001\u0000\u0000\u0000\u0000\u0019\u0001\u0000\u0000"+
					"\u0000\u0000\u001b\u0001\u0000\u0000\u0000\u0000\u001d\u0001\u0000\u0000"+
					"\u0000\u0000\u001f\u0001\u0000\u0000\u0000\u0001!\u0001\u0000\u0000\u0000"+
					"\u0003%\u0001\u0000\u0000\u0000\u0005(\u0001\u0000\u0000\u0000\u0007/"+
					"\u0001\u0000\u0000\u0000\t1\u0001\u0000\u0000\u0000\u000b4\u0001\u0000"+
					"\u0000\u0000\r6\u0001\u0000\u0000\u0000\u000f9\u0001\u0000\u0000\u0000"+
					"\u0011<\u0001\u0000\u0000\u0000\u0013?\u0001\u0000\u0000\u0000\u0015A"+
					"\u0001\u0000\u0000\u0000\u0017C\u0001\u0000\u0000\u0000\u0019N\u0001\u0000"+
					"\u0000\u0000\u001be\u0001\u0000\u0000\u0000\u001dh\u0001\u0000\u0000\u0000"+
					"\u001fu\u0001\u0000\u0000\u0000!\"\u0005a\u0000\u0000\"#\u0005n\u0000"+
					"\u0000#$\u0005d\u0000\u0000$\u0002\u0001\u0000\u0000\u0000%&\u0005o\u0000"+
					"\u0000&\'\u0005r\u0000\u0000\'\u0004\u0001\u0000\u0000\u0000()\u0005u"+
					"\u0000\u0000)*\u0005n\u0000\u0000*+\u0005l\u0000\u0000+,\u0005e\u0000"+
					"\u0000,-\u0005s\u0000\u0000-.\u0005s\u0000\u0000.\u0006\u0001\u0000\u0000"+
					"\u0000/0\u0005>\u0000\u00000\b\u0001\u0000\u0000\u000012\u0005>\u0000"+
					"\u000023\u0005=\u0000\u00003\n\u0001\u0000\u0000\u000045\u0005<\u0000"+
					"\u00005\f\u0001\u0000\u0000\u000067\u0005<\u0000\u000078\u0005=\u0000"+
					"\u00008\u000e\u0001\u0000\u0000\u00009:\u0005=\u0000\u0000:;\u0005=\u0000"+
					"\u0000;\u0010\u0001\u0000\u0000\u0000<=\u0005!\u0000\u0000=>\u0005=\u0000"+
					"\u0000>\u0012\u0001\u0000\u0000\u0000?@\u0005(\u0000\u0000@\u0014\u0001"+
					"\u0000\u0000\u0000AB\u0005)\u0000\u0000B\u0016\u0001\u0000\u0000\u0000"+
					"CD\u0005_\u0000\u0000DE\u0005_\u0000\u0000EF\u0005s\u0000\u0000FG\u0005"+
					"c\u0000\u0000GH\u0005r\u0000\u0000HI\u0005i\u0000\u0000IJ\u0005p\u0000"+
					"\u0000JK\u0005t\u0000\u0000KL\u0005_\u0000\u0000LM\u0005_\u0000\u0000"+
					"M\u0018\u0001\u0000\u0000\u0000NR\u0007\u0000\u0000\u0000OQ\u0007\u0001"+
					"\u0000\u0000PO\u0001\u0000\u0000\u0000QT\u0001\u0000\u0000\u0000RP\u0001"+
					"\u0000\u0000\u0000RS\u0001\u0000\u0000\u0000S\u001a\u0001\u0000\u0000"+
					"\u0000TR\u0001\u0000\u0000\u0000UY\u0005\"\u0000\u0000VX\b\u0002\u0000"+
					"\u0000WV\u0001\u0000\u0000\u0000X[\u0001\u0000\u0000\u0000YW\u0001\u0000"+
					"\u0000\u0000YZ\u0001\u0000\u0000\u0000Z\\\u0001\u0000\u0000\u0000[Y\u0001"+
					"\u0000\u0000\u0000\\f\u0005\"\u0000\u0000]a\u0005\'\u0000\u0000^`\b\u0003"+
					"\u0000\u0000_^\u0001\u0000\u0000\u0000`c\u0001\u0000\u0000\u0000a_\u0001"+
					"\u0000\u0000\u0000ab\u0001\u0000\u0000\u0000bd\u0001\u0000\u0000\u0000"+
					"ca\u0001\u0000\u0000\u0000df\u0005\'\u0000\u0000eU\u0001\u0000\u0000\u0000"+
					"e]\u0001\u0000\u0000\u0000f\u001c\u0001\u0000\u0000\u0000gi\u0007\u0004"+
					"\u0000\u0000hg\u0001\u0000\u0000\u0000ij\u0001\u0000\u0000\u0000jh\u0001"+
					"\u0000\u0000\u0000jk\u0001\u0000\u0000\u0000kr\u0001\u0000\u0000\u0000"+
					"ln\u0005.\u0000\u0000mo\u0007\u0004\u0000\u0000nm\u0001\u0000\u0000\u0000"+
					"op\u0001\u0000\u0000\u0000pn\u0001\u0000\u0000\u0000pq\u0001\u0000\u0000"+
					"\u0000qs\u0001\u0000\u0000\u0000rl\u0001\u0000\u0000\u0000rs\u0001\u0000"+
					"\u0000\u0000s\u001e\u0001\u0000\u0000\u0000tv\u0007\u0005\u0000\u0000"+
					"ut\u0001\u0000\u0000\u0000vw\u0001\u0000\u0000\u0000wu\u0001\u0000\u0000"+
					"\u0000wx\u0001\u0000\u0000\u0000xy\u0001\u0000\u0000\u0000yz\u0006\u000f"+
					"\u0000\u0000z \u0001\u0000\u0000\u0000\t\u0000RYaejprw\u0001\u0006\u0000"+
					"\u0000";
	public static final ATN _ATN =
			new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}