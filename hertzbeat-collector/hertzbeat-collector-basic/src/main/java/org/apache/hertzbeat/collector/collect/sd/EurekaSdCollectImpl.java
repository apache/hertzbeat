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

package org.apache.hertzbeat.collector.collect.sd;

import com.google.common.collect.Lists;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.support.ClassicRequestBuilder;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.EurekaSdProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.sd.ConnectionConfig;
import org.apache.hertzbeat.common.entity.sd.EurekaDiscoveryResponseEntity;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.XmlUtil;
import org.springframework.util.CollectionUtils;

/**
 * eureka service discovery collect impl
 */
@Slf4j
public class EurekaSdCollectImpl extends AbstractCollect {

    private static final String APP_LIST_PATH = "/apps";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        EurekaSdProtocol eurekaSd = metrics.getEureka_sd();
        if (eurekaSd == null || eurekaSd.getUrl() == null) {
            throw new IllegalArgumentException("Eureka Service Discovery url is required.");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        List<ConnectionConfig> configList = Lists.newArrayList();

        ClassicHttpRequest request = ClassicRequestBuilder.get()
                .setUri(metrics.getEureka_sd().getUrl() + APP_LIST_PATH)
                .build();

        // Use ResponseHandler to avoid manual resource management and deprecated execute methods
        HttpClientResponseHandler<String> responseHandler = response -> {
            int statusCode = response.getCode();
            if (statusCode != 200) {
                log.warn("Failed to fetch eureka sd...");
                builder.setMsg("StatusCode " + statusCode);
                builder.setCode(CollectRep.Code.FAIL);
                return null;
            }
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        };

        try {
            String responseBody = CommonHttpClient.getHttpClient().execute(request, responseHandler);

            if (responseBody != null) {
                EurekaDiscoveryResponseEntity responseEntity =
                        XmlUtil.fromXml(responseBody, EurekaDiscoveryResponseEntity.class);
                if (responseEntity == null || CollectionUtils.isEmpty(responseEntity.getApplications())) {
                    return;
                }

                responseEntity.getApplications()
                        .stream()
                        .filter(application -> !CollectionUtils.isEmpty(application.getInstances()))
                        .forEach(application -> convertTarget(configList, application));

                configList.forEach(config -> {
                    CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                    valueRowBuilder.addColumn(config.getHost());
                    valueRowBuilder.addColumn(config.getPort());
                    builder.addValueRow(valueRowBuilder.build());
                });
            }
        } catch (IOException e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("Failed to fetch eureka sd... {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("Failed to fetch eureka sd... {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    private void convertTarget(List<ConnectionConfig> configList,
                               EurekaDiscoveryResponseEntity.Application application) {
        application.getInstances().forEach(instance -> {
            String host = instance.getIpAddr();
            int port = instance.getPort() == null ? 80 : instance.getPort();
            configList.add(ConnectionConfig.builder()
                    .host(host)
                    .port(String.valueOf(port))
                    .build());
        });
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_EUREKA_SD;
    }
}