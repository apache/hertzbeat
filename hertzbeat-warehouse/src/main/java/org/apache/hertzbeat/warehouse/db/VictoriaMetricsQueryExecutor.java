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
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.warehouse.store.history.vm.PromQlQueryContent;
import org.apache.hertzbeat.warehouse.store.history.vm.VictoriaMetricsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * query executor for victor metrics
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.victoria-metrics", name = "enabled", havingValue = "true")
@Slf4j
public class VictoriaMetricsQueryExecutor extends PromqlQueryExecutor {

    private static final String QUERY_PATH = "/api/v1/query";
    
    private final VictoriaMetricsProperties victoriaMetricsProp;

    public VictoriaMetricsQueryExecutor(VictoriaMetricsProperties victoriaMetricsProp, RestTemplate restTemplate) {
        super(restTemplate, new HttpPromqlProperties(victoriaMetricsProp.url() + QUERY_PATH,
                victoriaMetricsProp.username(), victoriaMetricsProp.password()));
        this.victoriaMetricsProp = victoriaMetricsProp;
    }

}
