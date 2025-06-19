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

package org.apache.hertzbeat.warehouse.db;


import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * query executor for victor metrics
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.victoria-metrics", name = "enabled", havingValue = "true")
@Slf4j
public class VictoriaMetricsQueryExecutor extends PromqlQueryExecutor {
    private static final String Datasource = "VictoriaMetrics";
    
    private final VictoriaMetricsProperties victoriaMetricsProp;

    public VictoriaMetricsQueryExecutor(VictoriaMetricsProperties victoriaMetricsProp, RestTemplate restTemplate) {
        super(restTemplate, new HttpPromqlProperties(victoriaMetricsProp.url(),
                victoriaMetricsProp.username(), victoriaMetricsProp.password()));
        this.victoriaMetricsProp = victoriaMetricsProp;
    }

    @Override
    public String getDatasource() {
        return Datasource;
    }

}
