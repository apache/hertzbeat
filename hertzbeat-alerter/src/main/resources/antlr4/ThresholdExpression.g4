grammar ThresholdExpression;

// Parser rules
expr
    : '(' expr ')'                       # ParenExpr
    | left=expr op=('and' | 'or') right=expr   # LogicalExpr
    | left=expr 'unless' right=expr      # UnlessExpr
    | identifier op=('>' | '>=' | '<' | '<=' | '==' | '!=') number  # ComparisonExpr
    | identifier                         # QueryExpr
    | number                             # LiteralExpr
    ;

// Lexer rules
AND     : 'and' ;
OR      : 'or' ;
UNLESS  : 'unless' ;
GT      : '>' ;
GE      : '>=' ;
LT      : '<' ;
LE      : '<=' ;
EQ      : '==' ;
NE      : '!=' ;
LPAREN  : '(' ;
RPAREN  : ')' ;

identifier
    : IDENTIFIER
    ;

number
    : NUMBER
    ;

IDENTIFIER : [a-zA-Z_] [a-zA-Z0-9_=～{}[\]".]*;
NUMBER     : [0-9]+ ('.' [0-9]+)? ;
WS         : [ \t\r\n]+ -> skip ;