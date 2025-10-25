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

package org.apache.hertzbeat.warehouse.store.history.tsdb.alibabacloud;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.gson.annotations.SerializedName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Data entitie
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TimeStreamIndexedEntity {

    /**
     * Document ID
     */
    private String id;

    /**
     * Tag list
     * Example: {"env":"test"}
     */
    private Map<String, String> labels;

    /**
     * Metric data collection, where metrics can only be of type long or double.
     */
    private Map<String, Number> metrics;

    /**
     * Current time
     */
    @SerializedName("@timestamp")
    @JsonProperty("@timestamp")
    private long timestamp;

    /**
     * Operation Type - Reserved
     */
    private Operator operator;

    /**
     * Parameters
     */
    private Map<String, Object> actionParams;


    public void clear() {
        this.operator = null;
        this.actionParams = null;
    }

    enum Operator {
        INSERT, UPDATE, DELETE
    }

}