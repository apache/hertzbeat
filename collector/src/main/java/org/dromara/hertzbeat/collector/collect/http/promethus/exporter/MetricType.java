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

package org.dromara.hertzbeat.collector.collect.http.promethus.exporter;

/**
 * prometheus metrics type
 * @author ceilzcx
 *
 */
public enum MetricType {
    // for string metric info
    INFO("info"),
    // 代表单调递增的计数器, 例: 统计次数
    COUNTER("counter"),
    // 任意上下波动的指标类型, 例: CPU的使用率
    GAUGE("gauge"),
    SUMMARY("summary"),
    UNTYPED("untyped"),
    HISTOGRAM("histogram");

    private final String value;

    MetricType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static MetricType getType(String value) {
        for (MetricType metricType : values()) {
            if (metricType.getValue().equals(value)) {
                return metricType;
            }
        }
        return null;
    }
}
