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

package org.apache.hertzbeat.collector.dispatch.entrance.sd.impl;

import com.google.common.collect.Lists;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.common.cache.sd.ConnectionConfig;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.entrance.sd.ServiceDiscoveryFetcher;
import org.apache.hertzbeat.collector.dispatch.entrance.sd.ServiceDiscoveryFetchStrategy;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryResponseEntity;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

/**
 * http sd
 */
@Slf4j
@Component
public class HttpSdFetchStrategy implements ServiceDiscoveryFetchStrategy {
    @Override
    public List<ConnectionConfig> fetch(String target) {
        List<ConnectionConfig> configList = Lists.newArrayList();
        HttpUriRequest request = RequestBuilder.get().setUri(target).build();

        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != 200) {
                log.warn("Failed to fetch sd...");
                return configList;
            }

            String responseBody = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            final ServiceDiscoveryResponseEntity responseEntity = JsonUtil.fromJson(responseBody, ServiceDiscoveryResponseEntity.class);
            if (Objects.isNull(responseEntity) || StringUtils.isBlank(responseEntity.getTarget())) {
                return configList;
            }

            for (String url : responseEntity.getTarget().split(",")) {
                final String[] split = url.split(":");
                if (split.length != 2) {
                    continue;
                }

                configList.add(ConnectionConfig.builder()
                        .host(split[0])
                        .port(split[1])
                        .build());
            }
        } catch (IOException e) {
            log.warn("Failed to fetch sd... {}", CommonUtil.getMessageFromThrowable(e));
        }

        return configList;
    }

    @Override
    public ServiceDiscoveryProtocol.Type getType() {
        return ServiceDiscoveryProtocol.Type.HTTP_SD;
    }

    @PostConstruct
    public void init() {
        ServiceDiscoveryFetcher.addMap(new HttpSdFetchStrategy());
    }
}
