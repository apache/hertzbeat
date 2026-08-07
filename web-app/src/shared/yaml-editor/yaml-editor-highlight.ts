/*
 * Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
 */

import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/** Semantic YAML colors shared by the single and comparison editors. */
export const yamlHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--hb-syntax-property)' },
  { tag: tags.string, color: 'var(--hb-syntax-string)' },
  { tag: tags.number, color: 'var(--hb-syntax-number)' },
  { tag: [tags.atom, tags.bool, tags.null], color: 'var(--hb-syntax-atom)' },
  { tag: tags.punctuation, color: 'var(--hb-syntax-punctuation)' },
  { tag: tags.comment, color: 'var(--hb-syntax-comment)', fontStyle: 'italic' }
]);
