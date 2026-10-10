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
