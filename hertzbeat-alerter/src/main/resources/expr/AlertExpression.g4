grammar AlertExpression;

expression
    : expr EOF
    ;

expr
    : '(' expr ')'                       # ParenExpr
    | left=expr op=('>='|'<='|'>'|'<'|'=='|'!=') right=expr  # ComparisonExpr
    | left=expr 'and' right=expr         # AndExpr
    | left=expr 'unless' right=expr      # UnlessExpr
    | left=expr 'or' right=expr          # OrExpr
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