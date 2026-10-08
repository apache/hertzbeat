/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export type QueryFormulaNode =
  | { kind: 'number'; value: number }
  | { kind: 'ref'; name: string }
  | { kind: 'function'; name: 'abs' | 'log2' | 'log10'; operand: QueryFormulaNode }
  | { kind: 'unary'; sign: '+' | '-'; operand: QueryFormulaNode }
  | { kind: 'binary'; operator: string; left: QueryFormulaNode; right: QueryFormulaNode };

export class QueryFormulaError extends Error {
  constructor(readonly position: number) {
    super(`Invalid query formula at position ${position + 1}`);
    this.name = 'QueryFormulaError';
  }
}

/** A bounded arithmetic grammar; source references are the only allowed identifiers. */
export function parseQueryFormula(expression: string) {
  if (!expression.trim() || expression.length > 256) throw new QueryFormulaError(0);
  const parser = new FormulaParser(expression);
  const ast = parser.expression();
  if (parser.peek() !== '') throw new QueryFormulaError(parser.position);
  return { ast, references: [...parser.references].sort() };
}

class FormulaParser {
  position = 0;
  references = new Set<string>();
  private depth = 0;
  constructor(private readonly text: string) {}
  peek() {
    while (/\s/u.test(this.text[this.position] ?? '') && this.position < this.text.length) this.position++;
    return this.text[this.position] ?? '';
  }
  expression(minimum = 0): QueryFormulaNode {
    if (++this.depth > 24) throw new QueryFormulaError(this.position);
    let left = this.atom();
    while (this.peek()) {
      const operator = this.peek();
      const precedence = operator === '+' || operator === '-' ? 1 : operator === '*' || operator === '/' ? 2 : 0;
      if (!precedence || precedence <= minimum) break;
      this.position++;
      left = { kind: 'binary', operator, left, right: this.expression(precedence) };
    }
    this.depth--;
    return left;
  }
  private atom(): QueryFormulaNode {
    const token = this.peek();
    if (token === '+' || token === '-') {
      this.position++;
      return { kind: 'unary', sign: token, operand: this.expression(3) };
    }
    if (token === '(') {
      this.position++;
      const value = this.expression();
      this.expect(')');
      return value;
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)/u.exec(this.text.slice(this.position));
    if (number) {
      this.position += number[0].length;
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new QueryFormulaError(this.position);
      return { kind: 'number', value };
    }
    return this.identifier();
  }
  private identifier(): QueryFormulaNode {
    const name = /^[a-z][a-z0-9]*/u.exec(this.text.slice(this.position))?.[0];
    if (!name) throw new QueryFormulaError(this.position);
    this.position += name.length;
    if (name.length === 1) {
      this.references.add(name);
      return { kind: 'ref', name };
    }
    if (name === 'abs' || name === 'log2' || name === 'log10') {
      this.expect('(');
      const operand = this.expression();
      this.expect(')');
      return { kind: 'function', name, operand };
    }
    if (name !== 'minimum' && name !== 'maximum' && name !== 'pow') throw new QueryFormulaError(this.position);
    this.expect('(');
    const left = this.expression();
    this.expect(',');
    const right = this.expression();
    this.expect(')');
    return { kind: 'binary', operator: name, left, right };
  }
  private expect(token: string) {
    if (this.peek() !== token) throw new QueryFormulaError(this.position);
    this.position++;
  }
}

export function evaluateQueryFormula(node: QueryFormulaNode, values: Record<string, number | null>): number | null {
  if (node.kind === 'number') return node.value;
  if (node.kind === 'ref')
    return Object.hasOwn(values, node.name) && Number.isFinite(values[node.name]) ? values[node.name]! : null;
  if (node.kind === 'function' || node.kind === 'unary') return evaluateUnary(node, values);
  const left = evaluateQueryFormula(node.left, values);
  const right = evaluateQueryFormula(node.right, values);
  if (left === null || right === null) return null;
  const value = binaryValue(node.operator, left, right);
  return Number.isFinite(value) ? value : null;
}
function evaluateUnary(
  node: Extract<QueryFormulaNode, { kind: 'unary' | 'function' }>,
  values: Record<string, number | null>
) {
  const operand = evaluateQueryFormula(node.operand, values);
  if (operand === null) return null;
  if (node.kind === 'unary') return node.sign === '-' ? -operand : operand;
  const value = unaryFunctionValue(node.name, operand);
  return Number.isFinite(value) ? value : null;
}

function binaryValue(operator: string, left: number, right: number) {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right === 0 ? NaN : left / right;
    case 'pow':
      return Math.pow(left, right);
    case 'minimum':
      return Math.min(left, right);
    case 'maximum':
      return Math.max(left, right);
    default:
      return NaN;
  }
}

function unaryFunctionValue(name: 'abs' | 'log2' | 'log10', value: number) {
  switch (name) {
    case 'abs':
      return Math.abs(value);
    case 'log2':
      return Math.log2(value);
    case 'log10':
      return Math.log10(value);
  }
}
