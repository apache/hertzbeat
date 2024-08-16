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

package org.apache.hertzbeat.collector.collect.http.promethus;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 * prometheus parse creater
 */
@Slf4j
@Component
public class PrometheusParseCreator implements InitializingBean {
    private static final AbstractPrometheusParse PROMETHEUS_PARSE = new PrometheusVectorParser();

    private static void create() {
        PROMETHEUS_PARSE.setInstance(new PrometheusMatrixParser().setInstance(new PrometheusLastParser()));
    }

    public static AbstractPrometheusParse getPrometheusParse(){
        return PROMETHEUS_PARSE;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        create();
    }
}
