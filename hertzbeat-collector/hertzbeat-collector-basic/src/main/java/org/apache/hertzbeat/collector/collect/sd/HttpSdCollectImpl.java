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

package org.apache.hertzbeat.collector.collect.sd;

import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.collect.Lists;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.sd.ConnectionConfig;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryResponseEntity;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.util.CollectionUtils;


/**
 * http sd collector
 */
@Slf4j
public class HttpSdCollectImpl extends AbstractCollect {
    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        List<ConnectionConfig> configList = Lists.newArrayList();
        HttpUriRequest request = RequestBuilder.get().setUri(metrics.getSdProtocol().getSdSource()).build();

        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request)) {
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != 200) {
                log.warn("Failed to fetch sd...");
                builder.setMsg("StatusCode " + statusCode);
                builder.setCode(CollectRep.Code.FAIL);
                return;
            }

            String responseBody = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            TypeReference<List<ServiceDiscoveryResponseEntity>> typeReference = new TypeReference<>() {};
            final List<ServiceDiscoveryResponseEntity> responseEntityList = JsonUtil.fromJson(responseBody, typeReference);
            if (CollectionUtils.isEmpty(responseEntityList)) {
                return;
            }

            responseEntityList.stream()
                    .filter(entity -> !CollectionUtils.isEmpty(entity.getTarget()))
                    .forEach(responseEntity -> convertTarget(configList, responseEntity));


            configList.forEach(config -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                valueRowBuilder.addColumn(config.getHost());
                valueRowBuilder.addColumn(config.getPort());
                builder.addValueRow(valueRowBuilder.build());
            });
        } catch (IOException e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("Failed to fetch sd... {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    private void convertTarget(List<ConnectionConfig> configList, ServiceDiscoveryResponseEntity responseEntity) {
        responseEntity.getTarget().stream()
                .filter(StringUtils::isNotBlank)
                .forEach(fetchedTarget -> addConfig(configList, fetchedTarget));
    }

    private void addConfig(List<ConnectionConfig> configList, String fetchedTarget) {
        for (String url : fetchedTarget.split(",")) {
            final String[] split = url.split(":");
            if (split.length != 2) {
                continue;
            }

            configList.add(ConnectionConfig.builder()
                    .host(split[0])
                    .port(split[1])
                    .build());
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_HTTP_SD;
    }
}
