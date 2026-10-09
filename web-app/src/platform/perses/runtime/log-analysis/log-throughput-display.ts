/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { formatMetricSampleValue } from '../../metrics/metric-sample-model';

export function formatLogNumericValue(value: number) {
  return formatMetricSampleValue(value);
}
