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
		RPAREN=11, IDENTIFIER=12, NUMBER=13, WS=14;
	public static String[] channelNames = {
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN"
	};

	public static String[] modeNames = {
		"DEFAULT_MODE"
	};

	private static String[] makeRuleNames() {
		return new String[] {
			"AND", "OR", "UNLESS", "GT", "GE", "LT", "LE", "EQ", "NE", "LPAREN", 
			"RPAREN", "IDENTIFIER", "NUMBER", "WS"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, "'and'", "'or'", "'unless'", "'>'", "'>='", "'<'", "'<='", "'=='", 
			"'!='", "'('", "')'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "AND", "OR", "UNLESS", "GT", "GE", "LT", "LE", "EQ", "NE", "LPAREN", 
			"RPAREN", "IDENTIFIER", "NUMBER", "WS"
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
		"\u0004\u0000\u000eZ\u0006\uffff\uffff\u0002\u0000\u0007\u0000\u0002\u0001"+
		"\u0007\u0001\u0002\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004"+
		"\u0007\u0004\u0002\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007"+
		"\u0007\u0007\u0002\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b"+
		"\u0007\u000b\u0002\f\u0007\f\u0002\r\u0007\r\u0001\u0000\u0001\u0000\u0001"+
		"\u0000\u0001\u0000\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0002\u0001"+
		"\u0002\u0001\u0002\u0001\u0002\u0001\u0002\u0001\u0002\u0001\u0002\u0001"+
		"\u0003\u0001\u0003\u0001\u0004\u0001\u0004\u0001\u0004\u0001\u0005\u0001"+
		"\u0005\u0001\u0006\u0001\u0006\u0001\u0006\u0001\u0007\u0001\u0007\u0001"+
		"\u0007\u0001\b\u0001\b\u0001\b\u0001\t\u0001\t\u0001\n\u0001\n\u0001\u000b"+
		"\u0001\u000b\u0005\u000bB\b\u000b\n\u000b\f\u000bE\t\u000b\u0001\f\u0004"+
		"\fH\b\f\u000b\f\f\fI\u0001\f\u0001\f\u0004\fN\b\f\u000b\f\f\fO\u0003\f"+
		"R\b\f\u0001\r\u0004\rU\b\r\u000b\r\f\rV\u0001\r\u0001\r\u0000\u0000\u000e"+
		"\u0001\u0001\u0003\u0002\u0005\u0003\u0007\u0004\t\u0005\u000b\u0006\r"+
		"\u0007\u000f\b\u0011\t\u0013\n\u0015\u000b\u0017\f\u0019\r\u001b\u000e"+
		"\u0001\u0000\u0004\u0003\u0000AZ__az\n\u0000\"\"..09==A[]]__a{}}\u8000"+
		"\uff5e\u8000\uff5e\u0001\u000009\u0003\u0000\t\n\r\r  ^\u0000\u0001\u0001"+
		"\u0000\u0000\u0000\u0000\u0003\u0001\u0000\u0000\u0000\u0000\u0005\u0001"+
		"\u0000\u0000\u0000\u0000\u0007\u0001\u0000\u0000\u0000\u0000\t\u0001\u0000"+
		"\u0000\u0000\u0000\u000b\u0001\u0000\u0000\u0000\u0000\r\u0001\u0000\u0000"+
		"\u0000\u0000\u000f\u0001\u0000\u0000\u0000\u0000\u0011\u0001\u0000\u0000"+
		"\u0000\u0000\u0013\u0001\u0000\u0000\u0000\u0000\u0015\u0001\u0000\u0000"+
		"\u0000\u0000\u0017\u0001\u0000\u0000\u0000\u0000\u0019\u0001\u0000\u0000"+
		"\u0000\u0000\u001b\u0001\u0000\u0000\u0000\u0001\u001d\u0001\u0000\u0000"+
		"\u0000\u0003!\u0001\u0000\u0000\u0000\u0005$\u0001\u0000\u0000\u0000\u0007"+
		"+\u0001\u0000\u0000\u0000\t-\u0001\u0000\u0000\u0000\u000b0\u0001\u0000"+
		"\u0000\u0000\r2\u0001\u0000\u0000\u0000\u000f5\u0001\u0000\u0000\u0000"+
		"\u00118\u0001\u0000\u0000\u0000\u0013;\u0001\u0000\u0000\u0000\u0015="+
		"\u0001\u0000\u0000\u0000\u0017?\u0001\u0000\u0000\u0000\u0019G\u0001\u0000"+
		"\u0000\u0000\u001bT\u0001\u0000\u0000\u0000\u001d\u001e\u0005a\u0000\u0000"+
		"\u001e\u001f\u0005n\u0000\u0000\u001f \u0005d\u0000\u0000 \u0002\u0001"+
		"\u0000\u0000\u0000!\"\u0005o\u0000\u0000\"#\u0005r\u0000\u0000#\u0004"+
		"\u0001\u0000\u0000\u0000$%\u0005u\u0000\u0000%&\u0005n\u0000\u0000&\'"+
		"\u0005l\u0000\u0000\'(\u0005e\u0000\u0000()\u0005s\u0000\u0000)*\u0005"+
		"s\u0000\u0000*\u0006\u0001\u0000\u0000\u0000+,\u0005>\u0000\u0000,\b\u0001"+
		"\u0000\u0000\u0000-.\u0005>\u0000\u0000./\u0005=\u0000\u0000/\n\u0001"+
		"\u0000\u0000\u000001\u0005<\u0000\u00001\f\u0001\u0000\u0000\u000023\u0005"+
		"<\u0000\u000034\u0005=\u0000\u00004\u000e\u0001\u0000\u0000\u000056\u0005"+
		"=\u0000\u000067\u0005=\u0000\u00007\u0010\u0001\u0000\u0000\u000089\u0005"+
		"!\u0000\u00009:\u0005=\u0000\u0000:\u0012\u0001\u0000\u0000\u0000;<\u0005"+
		"(\u0000\u0000<\u0014\u0001\u0000\u0000\u0000=>\u0005)\u0000\u0000>\u0016"+
		"\u0001\u0000\u0000\u0000?C\u0007\u0000\u0000\u0000@B\u0007\u0001\u0000"+
		"\u0000A@\u0001\u0000\u0000\u0000BE\u0001\u0000\u0000\u0000CA\u0001\u0000"+
		"\u0000\u0000CD\u0001\u0000\u0000\u0000D\u0018\u0001\u0000\u0000\u0000"+
		"EC\u0001\u0000\u0000\u0000FH\u0007\u0002\u0000\u0000GF\u0001\u0000\u0000"+
		"\u0000HI\u0001\u0000\u0000\u0000IG\u0001\u0000\u0000\u0000IJ\u0001\u0000"+
		"\u0000\u0000JQ\u0001\u0000\u0000\u0000KM\u0005.\u0000\u0000LN\u0007\u0002"+
		"\u0000\u0000ML\u0001\u0000\u0000\u0000NO\u0001\u0000\u0000\u0000OM\u0001"+
		"\u0000\u0000\u0000OP\u0001\u0000\u0000\u0000PR\u0001\u0000\u0000\u0000"+
		"QK\u0001\u0000\u0000\u0000QR\u0001\u0000\u0000\u0000R\u001a\u0001\u0000"+
		"\u0000\u0000SU\u0007\u0003\u0000\u0000TS\u0001\u0000\u0000\u0000UV\u0001"+
		"\u0000\u0000\u0000VT\u0001\u0000\u0000\u0000VW\u0001\u0000\u0000\u0000"+
		"WX\u0001\u0000\u0000\u0000XY\u0006\r\u0000\u0000Y\u001c\u0001\u0000\u0000"+
		"\u0000\u0006\u0000CIOQV\u0001\u0006\u0000\u0000";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}