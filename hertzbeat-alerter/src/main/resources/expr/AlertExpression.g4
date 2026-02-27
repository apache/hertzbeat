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

grammar AlertExpression;

expression
    : expr EOF
    ;

expr
    : LPAREN expr RPAREN                                          # ParenExpr
    | left=expr op=(GE|LE|GT|LT|EQ|NE) BOOL? right=expr          # ComparisonExpr
    | left=expr AND right=expr                                    # AndExpr
    | left=expr UNLESS right=expr                                 # UnlessExpr
    | left=expr OR right=expr                                     # OrExpr
    | promql                                                      # PromqlExpr
    | selectSql                                                   # SqlExpr
    | number                                                      # LiteralExpr
    | SQL_FUNCTION LPAREN string RPAREN                           # SqlCallExpr
    | PROMQL_FUNCTION LPAREN string RPAREN                        # PromqlCallExpr
    ;

functionCall
    : functionName LPAREN parameterList RPAREN
    ;

parameterList
    : parameter (COMMA parameter)*
    ;

parameter
    : expr
    | STAR
    | string
    | duration
    ;

number
    : NUMBER
    | FLOAT
    | SCIENTIFIC_NUMBER
    ;

string
    : STRING
    ;

duration
    : DURATION
    ;

functionName
    : COUNT
    | AVG
    | SUM
    | MIN
    | MAX
    | RATE_FUNCTION
    | INCREASE_FUNCTION
    | HISTOGRAM_QUANTILE_FUNCTION
    | BY_FUNCTION
    | WITHOUT_FUNCTION
    | GROUP_LEFT_FUNCTION
    | GROUP_RIGHT_FUNCTION
    | IGNORING_FUNCTION
    | ON_FUNCTION
    | IDENTIFIER
    ;

// SQL grammar for complex queries
selectSql
    : SELECT selectFieldList FROM relList (WHERE conditionList)?
      (GROUP BY groupByList)? (HAVING conditionList)?
      (ORDER BY orderByList)? (LIMIT limitClause)?
    ;

selectFieldList
    : selectField (COMMA selectField)*
    ;

selectField
    : functionCall (AS? IDENTIFIER)?
    | IDENTIFIER (AS? IDENTIFIER)?
    | STAR (AS? IDENTIFIER)?
    | IDENTIFIER DOT IDENTIFIER (AS? IDENTIFIER)?
    ;

groupByList
    : IDENTIFIER (COMMA IDENTIFIER)*
    ;

orderByList
    : orderByField (COMMA orderByField)*
    ;

orderByField
    : IDENTIFIER (ASC | DESC)?
    | functionCall (ASC | DESC)?
    ;

limitClause
    : NUMBER
    ;

relList
    : relation (COMMA relation)*
    ;

relation
    : IDENTIFIER (AS? IDENTIFIER)?
    | LPAREN selectSql RPAREN AS IDENTIFIER
    ;

conditionList
    : conditionList AND conditionList
    | conditionList OR conditionList
    | condition
    | LPAREN conditionList RPAREN
    ;

compOp
    : EQ | LT | GT | LE | GE | NE | LIKE | NOT LIKE | IN | NOT IN | IS | IS NOT
    ;

condition
    : conditionUnit compOp conditionUnit
    | LPAREN condition RPAREN
    | IDENTIFIER BETWEEN number AND number
    ;

conditionUnit
    : number
    | string
    | IDENTIFIER
    | IDENTIFIER DOT IDENTIFIER
    | NULL
    | LPAREN selectSql RPAREN
    | functionCall
    ;

// PromQL query expressions
promql
    : metricSelector instantVectorOp?
    | aggregationOperator LPAREN promql (BY labelList)? RPAREN
    | functionCall
    | promql LBRACKET duration RBRACKET
    | promql LBRACKET duration COLON duration RBRACKET
    | promql OFFSET duration
    | IDENTIFIER
    ;

metricSelector
    : LBRACE labelMatcherList? RBRACE
    ;

labelMatcherList
    : labelMatcherItem (COMMA labelMatcherItem)*
    ;

labelMatcherItem
    : IDENTIFIER labelMatcherOp string
    ;

labelMatcherOp
    : EQ | NE
    ;

labelList
    : LPAREN IDENTIFIER (COMMA IDENTIFIER)* RPAREN
    ;

instantVectorOp
    : LBRACKET duration RBRACKET
    ;

aggregationOperator
    : SUM | AVG | COUNT | MIN | MAX | STDDEV | STDVAR | TOPK | BOTTOMK | QUANTILE
    ;

// Lexer rules

// Boolean operators
AND      : [Aa][Nn][Dd] ;
OR       : [Oo][Rr] ;
UNLESS   : [Uu][Nn][Ll][Ee][Ss][Ss] ;
NOT      : [Nn][Oo][Tt] ;

// SQL keywords
SELECT  : [Ss][Ee][Ll][Ee][Cc][Tt] ;
FROM    : [Ff][Rr][Oo][Mm] ;
WHERE   : [Ww][Hh][Ee][Rr][Ee] ;
GROUP   : [Gg][Rr][Oo][Uu][Pp] ;
BY      : [Bb][Yy] ;
HAVING  : [Hh][Aa][Vv][Ii][Nn][Gg] ;
ORDER   : [Oo][Rr][Dd][Ee][Rr] ;
LIMIT   : [Ll][Ii][Mm][Ii][Tt] ;
OFFSET  : [Oo][Ff][Ff][Ss][Ee][Tt] ;
AS      : [Aa][Ss] ;
ASC     : [Aa][Ss][Cc] ;
DESC    : [Dd][Ee][Ss][Cc] ;
IN      : [Ii][Nn] ;
IS      : [Ii][Ss] ;
NULL    : [Nn][Uu][Ll][Ll] ;
LIKE    : [Ll][Ii][Kk][Ee] ;
BETWEEN : [Bb][Ee][Tt][Ww][Ee][Ee][Nn] ;
STAR    : '*' ;

// Aggregate functions
COUNT   : [Cc][Oo][Uu][Nn][Tt] ;
SUM     : [Ss][Uu][Mm] ;
AVG     : [Aa][Vv][Gg] ;
MIN     : [Mm][Ii][Nn] ;
MAX     : [Mm][Aa][Xx] ;
STDDEV  : [Ss][Tt][Dd][Dd][Ee][Vv] ;
STDVAR  : [Ss][Tt][Dd][Vv][Aa][Rr] ;
VARIANCE: [Vv][Aa][Rr][Ii][Aa][Nn][Cc][Ee] ;

// PromQL specific functions
RATE_FUNCTION    : [Rr][Aa][Tt][Ee] ;
INCREASE_FUNCTION: [Ii][Nn][Cc][Rr][Ee][Aa][Ss][Ee] ;
HISTOGRAM_QUANTILE_FUNCTION: [Hh][Ii][Ss][Tt][Oo][Gg][Rr][Aa][Mm] '_' [Qq][Uu][Aa][Nn][Tt][Ii][Ll][Ee] ;
TOPK    : [Tt][Oo][Pp][Kk] ;
BOTTOMK : [Bb][Oo][Tt][Tt][Oo][Mm][Kk] ;
QUANTILE: [Qq][Uu][Aa][Nn][Tt][Ii][Ll][Ee] ;
BY_FUNCTION: [Bb][Yy] ;
WITHOUT_FUNCTION: [Ww][Ii][Tt][Hh][Oo][Uu][Tt] ;
GROUP_LEFT_FUNCTION: [Gg][Rr][Oo][Uu][Pp] '_' [Ll][Ee][Ff][Tt] ;
GROUP_RIGHT_FUNCTION: [Gg][Rr][Oo][Uu][Pp] '_' [Rr][Ii][Gg][Hh][Tt] ;
IGNORING_FUNCTION: [Ii][Gg][Nn][Oo][Rr][Ii][Nn][Gg] ;
ON_FUNCTION: [Oo][Nn] ;

// Other functions
SQL_FUNCTION: [Ss][Qq][Ll] ;
PROMQL_FUNCTION: [Pp][Rr][Oo][Mm][Qq][Ll] ;

// Comparison operators
GT      : '>' ;
GE      : '>=' ;
LT      : '<' ;
LE      : '<=' ;
EQ      : '==' | '=' ;
NE      : '!=' ;
BOOL    : 'bool';

// Delimiters
LPAREN  : '(' ;
RPAREN  : ')' ;
LBRACE  : '{' ;
RBRACE  : '}' ;
LBRACKET: '[' ;
RBRACKET: ']' ;
COMMA   : ',' ;
DOT     : '.' ;
COLON   : ':' ;
SEMICOLON: ';' ;

// number formats
SCIENTIFIC_NUMBER: [0-9]+ ('.' [0-9]+)? [eE] [+-]? [0-9]+ ;
FLOAT           : [0-9]+ '.' [0-9]+ ;
NUMBER          : [0-9]+ ;

// Duration literals for PromQL (e.g., 5m, 1h, 30s)
DURATION        : [0-9]+ [a-zA-Z]+ ;

// String literals
STRING          : '"' (~["\r\n\\] | '\\' .)* '"'
                | '\'' (~['\r\n\\] | '\\' .)* '\'' ;

// Identifiers and metric names
IDENTIFIER      : [a-zA-Z_] [a-zA-Z0-9_=～{}[\]".~-]* ;

// Whitespace and comments
WS              : [ \t\r\n]+ -> channel(HIDDEN) ;
LINE_COMMENT    : '//' ~[\r\n]* -> skip ;
BLOCK_COMMENT   : '/*' .*? '*/' -> skip ;