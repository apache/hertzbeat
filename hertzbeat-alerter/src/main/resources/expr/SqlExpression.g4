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

grammar SqlExpression;

expression
    : sqlExpr EOF
    ;

sqlExpr
    : selectSql                         # SelectSqlExpr
    | SQL_FUNCTION LPAREN string RPAREN # SelectSqlCallExpr
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

relList
    : relation (COMMA relation)*
    ;

relation
    : IDENTIFIER (AS? IDENTIFIER)?
    | LPAREN selectSql RPAREN AS IDENTIFIER
    ;

conditionList
    : condition
    | conditionList AND conditionList
    | conditionList OR conditionList
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

functionCall
    : functionName LPAREN parameterList RPAREN
    ;

functionName
    : COUNT
    | AVG
    | SUM
    | MIN
    | MAX
    | IDENTIFIER
    ;

parameterList
    : parameter (COMMA parameter)*
    ;

parameter
    : STAR
    | string
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

number
    : NUMBER
    | FLOAT
    ;

string
    : STRING
    ;


// Lexer rules

// Boolean operators
AND      : [Aa][Nn][Dd] ;
OR       : [Oo][Rr] ;
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
MAX     : [Aa][Xx] ;

// Other functions
SQL_FUNCTION: [Ss][Qq][Ll] ;

// Comparison operators
GT      : '>' ;
GE      : '>=' ;
LT      : '<' ;
LE      : '<=' ;
EQ      : '==' | '=' ;
NE      : '!=' ;

// Delimiters
LPAREN  : '(' ;
RPAREN  : ')' ;
LBRACKET: '[' ;
RBRACKET: ']' ;
COMMA   : ',' ;
DOT     : '.' ;
SEMICOLON: ';' ;

// number formats
FLOAT           : [0-9]+ '.' [0-9]+ ;
NUMBER          : [0-9]+ ;

// String literals
STRING          : '"' (~["\r\n\\] | '\\' .)* '"'
                | '\'' (~['\r\n\\] | '\\' .)* '\'' ;

// Identifiers
IDENTIFIER      : [a-zA-Z_][a-zA-Z0-9_]* ;

// Whitespace and comments
WS              : [ \t\r\n]+ -> channel(HIDDEN) ;
LINE_COMMENT    : '//' ~[\r\n]* -> skip ;
BLOCK_COMMENT   : '/*' .*? '*/' -> skip ;