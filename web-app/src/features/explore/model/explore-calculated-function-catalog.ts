/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

type Category = 'arithmetic' | 'string' | 'logical';
export type CalculatedFunction = {
  name: string;
  category: Category;
  signature: string;
  example: string;
  supported: boolean;
};

const entry = (
  category: Category,
  name: string,
  signature: string,
  example: string,
  supported = true
): CalculatedFunction => ({
  category,
  name,
  signature,
  example,
  supported
});

export const calculatedFunctions: CalculatedFunction[] = [
  entry('arithmetic', 'abs', 'abs(value)', 'abs(-12) → 12'),
  entry('arithmetic', 'ceiling', 'ceiling(value)', 'ceiling(1.2) → 2'),
  entry('arithmetic', 'floor', 'floor(value)', 'floor(1.8) → 1'),
  entry('arithmetic', 'min', 'min(value, …)', 'min(2, 3) → 2'),
  entry('arithmetic', 'max', 'max(value, …)', 'max(2, 3) → 3'),
  entry('arithmetic', 'round', 'round(value, [precision])', 'round(-1234.01, -1) → -1230'),
  entry('string', 'lower', 'lower(text)', 'lower("ABC") → "abc"'),
  entry('string', 'upper', 'upper(text)', 'upper("abc") → "ABC"'),
  entry('string', 'proper', 'proper(text)', 'proper("hello world") → "Hello World"'),
  entry('string', 'concat', 'concat(text, …)', 'concat("a", "b") → "ab"'),
  entry('string', 'textjoin', 'textjoin(delimiter, ignore_empty, text, …)', 'textjoin(",", "true", "a", "b") → "a,b"'),
  entry('string', 'left', 'left(text, length)', 'left("hello", 2) → "he"'),
  entry('string', 'right', 'right(text, length)', 'right("hello", 2) → "lo"'),
  entry('string', 'substring', 'substring(text, start, length)', 'substring("hello", 1, 2) → "el"'),
  entry('string', 'split_before', 'split_before(text, separator, occurrence)', 'split_before("a/b/c", "/", 1) → "a/b"'),
  entry('string', 'split_after', 'split_after(text, separator, occurrence)', 'split_after("a/b/c", "/", 1) → "c"'),
  entry('string', 'substring_count', 'substring_count(text, needle)', 'substring_count("aaa", "a") → 3'),
  entry('string', 'entropy', 'entropy(text)', 'entropy("abab") → 1'),
  entry(
    'string',
    'levenshtein_distance',
    'levenshtein_distance(left, right)',
    'levenshtein_distance("kitten", "sitting") → 3'
  ),
  entry('string', 'regexp_like', 'regexp_like(text, pattern)', 'regexp_like("abc", "b") → true'),
  entry(
    'string',
    'regexp_replace',
    'regexp_replace(text, pattern, replacement)',
    'regexp_replace("1x2x3", "[0-9]", "#") → "#x2x3"'
  ),
  entry('logical', 'is_null', 'is_null(value)', 'is_null(@missing) → true'),
  entry('logical', 'if', 'if(condition, then, else)', 'if(true, 1, 0) → 1'),
  entry('string', 'resource', 'resource("key")', 'resource("host.name") → "web-01"')
];
