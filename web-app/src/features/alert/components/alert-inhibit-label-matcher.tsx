/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import { AlertLabelMatcherEditor } from './alert-label-matcher-editor';

export function AlertInhibitLabelMatcher(props: {
  value: string;
  disabled: boolean;
  invalid: boolean;
  suggestions: AlertLabelSuggestionState;
  change: (value: string) => void;
}) {
  return <AlertLabelMatcherEditor {...props} translationRoot="alertInhibits" />;
}
