/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
export type SpanFilterTarget = { scope: 'resource' | 'attribute'; key: string; value: string };
export type SpanFilterControls = {
  onAddSpanFilter?: ((target: SpanFilterTarget, operator: '=' | '!=') => boolean) | undefined;
  spanFilterDisabledReason?: ((target: SpanFilterTarget, operator: '=' | '!=') => string | undefined) | undefined;
  onApplySpanFilters?: (() => void) | undefined;
  spanFilterPending?: boolean | undefined;
};
