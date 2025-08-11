/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * GreptimeDB SQL query content
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GreptimeSqlQueryContent {

    private int code;
    
    private List<Output> output;
    
    @JsonProperty("execution_time_ms")
    private long executionTimeMs;

    /**
     * Represents the output of a GreptimeDB SQL query.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Output {
        
        private Records records;

        /**
         * Represents the records returned by a GreptimeDB SQL query.
         */
        @Data
        @AllArgsConstructor
        @NoArgsConstructor
        public static class Records {
            
            private Schema schema;
            
            private List<List<Object>> rows;

            /**
             * Represents the schema of the records returned by a GreptimeDB SQL query.
             */
            @Data
            @AllArgsConstructor
            @NoArgsConstructor
            public static class Schema {
                
                @JsonProperty("column_schemas")
                private List<ColumnSchema> columnSchemas;

                /**
                 * Represents a column schema in the records returned by a GreptimeDB SQL query.
                 */
                @Data
                @AllArgsConstructor
                @NoArgsConstructor
                public static class ColumnSchema {
                    
                    private String name;
                    
                    @JsonProperty("data_type")
                    private String dataType;
                }
            }
        }
    }
}