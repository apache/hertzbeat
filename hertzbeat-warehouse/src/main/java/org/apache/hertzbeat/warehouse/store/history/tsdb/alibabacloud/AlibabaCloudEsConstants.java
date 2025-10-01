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

/**
 * Constants for AlibabaCloud Elasticsearch data storage
 */
public final class AlibabaCloudEsConstants {

    private AlibabaCloudEsConstants() {

    }

    // Elasticsearch specific constants
    public static final String TIME_STREAM = "_time_stream";
    public static final String INDEX_TYPE = "_doc";
    public static final String QUERY_RANGE_PATH = TIME_STREAM + "/prom/%s/query_range";
    
    // Label keys
    public static final String LABEL_KEY_HOST = "host";
    public static final String LABEL_KEY_INSTANCE = "instance";
    public static final String LABEL_KEY_JOB = "job";
    public static final String LABEL_KEY_NAME = "__name__";
    
    // Separators
    public static final String SPLIT = "_";
    
    // Error messages
    public static final String ES_INIT_ERROR_MSG = """
            
            \t---------------Alibaba Cloud Elasticsearch Init Failed---------------
            \t--------------Please Config Alibaba Cloud Elasticsearch--------------
            \t----------Can Not Use Metric History Now----------
            """;
}