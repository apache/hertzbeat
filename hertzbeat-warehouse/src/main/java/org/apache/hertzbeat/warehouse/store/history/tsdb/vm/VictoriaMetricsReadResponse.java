/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.vm;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.util.JsonUtil;

final class VictoriaMetricsReadResponse {
    private static final String LABEL_KEY_NAME = "__name__";
    private static final String LABEL_KEY_JOB = "job";
    private static final String LABEL_KEY_INSTANCE = "instance";
    private static final String LABEL_KEY_MONITOR_ID = "__monitor_id__";
    private static final String MONITOR_METRICS_KEY = "__metrics__";
    private static final String MONITOR_METRIC_KEY = "__metric__";

    private VictoriaMetricsReadResponse() {
    }

    static void appendValues(PromQlQueryContent response, Map<String, List<Value>> instanceValuesMap) {
        if (response != null && response.getData() != null
            && response.getData().getResult() != null) {
            List<PromQlQueryContent.ContentData.Content> contents = response.getData().getResult();
            for (PromQlQueryContent.ContentData.Content content : contents) {
                Map<String, String> labels = content.getMetric();
                labels.remove(LABEL_KEY_NAME);
                labels.remove(LABEL_KEY_JOB);
                labels.remove(LABEL_KEY_INSTANCE);
                labels.remove(LABEL_KEY_MONITOR_ID);
                labels.remove(MONITOR_METRICS_KEY);
                labels.remove(MONITOR_METRIC_KEY);
                String labelStr = JsonUtil.toJson(labels);
                if (content.getValues() != null && !content.getValues().isEmpty()) {
                    List<Value> valueList = instanceValuesMap.computeIfAbsent(labelStr, k -> new LinkedList<>());
                    for (Object[] valueArr : content.getValues()) {
                        long timestamp = Long.parseLong(String.valueOf(valueArr[0]));
                        String value = new BigDecimal(String.valueOf(valueArr[1])).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                        // read timestamp here is s unit
                        valueList.add(new Value(value, timestamp * 1000));
                    }
                }
            }
        }
    }

    static void appendAggregate(PromQlQueryContent response, Map<String, List<Value>> instanceValuesMap,
                                BiConsumer<Value, String> setter) {
        if (response != null && response.getData() != null
            && response.getData().getResult() != null) {
            List<PromQlQueryContent.ContentData.Content> contents = response.getData().getResult();
            for (PromQlQueryContent.ContentData.Content content : contents) {
                Map<String, String> labels = content.getMetric();
                labels.remove(LABEL_KEY_NAME);
                labels.remove(LABEL_KEY_JOB);
                labels.remove(LABEL_KEY_INSTANCE);
                labels.remove(LABEL_KEY_MONITOR_ID);
                labels.remove(MONITOR_METRICS_KEY);
                labels.remove(MONITOR_METRIC_KEY);
                String labelStr = JsonUtil.toJson(labels);
                if (content.getValues() != null && !content.getValues().isEmpty()) {
                    List<Value> valueList = instanceValuesMap.computeIfAbsent(labelStr, k -> new LinkedList<>());
                    if (valueList.size() == content.getValues().size()) {
                        for (int timestampIndex = 0; timestampIndex < valueList.size(); timestampIndex++) {
                            Value value = valueList.get(timestampIndex);
                            Object[] valueArr = content.getValues().get(timestampIndex);
                            String aggregateValue = new BigDecimal(String.valueOf(valueArr[1])).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                            setter.accept(value, aggregateValue);
                        }
                    }
                }
            }
        }
    }
}
