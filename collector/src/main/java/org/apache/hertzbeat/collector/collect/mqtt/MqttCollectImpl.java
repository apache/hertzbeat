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

package org.apache.hertzbeat.collector.collect.mqtt;

import com.hivemq.client.mqtt.MqttVersion;
import com.hivemq.client.mqtt.datatypes.MqttQos;
import com.hivemq.client.mqtt.mqtt3.Mqtt3AsyncClient;
import com.hivemq.client.mqtt.mqtt3.Mqtt3Client;
import com.hivemq.client.mqtt.mqtt3.Mqtt3ClientBuilder;
import com.hivemq.client.mqtt.mqtt3.message.connect.connack.Mqtt3ConnAck;
import com.hivemq.client.mqtt.mqtt5.Mqtt5AsyncClient;
import com.hivemq.client.mqtt.mqtt5.Mqtt5Client;
import com.hivemq.client.mqtt.mqtt5.Mqtt5ClientBuilder;
import com.hivemq.client.mqtt.mqtt5.message.connect.connack.Mqtt5ConnAck;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.Assert;
import org.springframework.util.StopWatch;

/**
 * collect mqtt metrics
 */
public class MqttCollectImpl extends AbstractCollect {

    public MqttCollectImpl() {
    }

    private static final Logger logger = LoggerFactory.getLogger(MqttCollectImpl.class);

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        MqttProtocol mqttProtocol = metrics.getMqtt();
        Assert.hasText(mqttProtocol.getHost(), "MQTT protocol host is required");
        Assert.hasText(mqttProtocol.getPort(), "MQTT protocol port is required");
        Assert.hasText(mqttProtocol.getProtocolVersion(), "MQTT protocol version is required");
    }

    @Override
    public void collect(Builder builder, long monitorId, String app, Metrics metrics) {
        MqttProtocol mqtt = metrics.getMqtt();
        String protocolVersion = mqtt.getProtocolVersion();
        MqttVersion mqttVersion = MqttVersion.valueOf(protocolVersion);
        if (mqttVersion == MqttVersion.MQTT_3_1_1) {
            collectWithVersion3(metrics, builder);
        } else if (mqttVersion == MqttVersion.MQTT_5_0) {
            collectWithVersion5(metrics, builder);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MQTT;
    }

    /**
     * collecting data of MQTT 5
     */
    private void collectWithVersion5(Metrics metrics, Builder builder) {
        MqttProtocol mqttProtocol = metrics.getMqtt();
        Map<Object, String> data = new HashMap<>();
        Mqtt5AsyncClient client = buildMqtt5Client(mqttProtocol);
        long responseTime = connectClient(client, mqtt5AsyncClient -> {
            CompletableFuture<Mqtt5ConnAck> connectFuture = mqtt5AsyncClient.connect();
            try {
                connectFuture.get(Long.parseLong(mqttProtocol.getTimeout()), TimeUnit.MILLISECONDS);
            } catch (InterruptedException | ExecutionException | TimeoutException e) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(getErrorMessage(e.getMessage()));
            }
        });
        testDescribeAndPublish5(client, mqttProtocol, data);
        convertToMetricsData(builder, metrics, responseTime, data);
        client.disconnect();
    }

    /**
     * collecting data of MQTT 3.1.1
     */
    private void collectWithVersion3(Metrics metrics, Builder builder) {
        MqttProtocol mqttProtocol = metrics.getMqtt();
        Map<Object, String> data = new HashMap<>();
        Mqtt3AsyncClient client = buildMqtt3Client(mqttProtocol);
        long responseTime = connectClient(client, mqtt3AsyncClient -> {
            CompletableFuture<Mqtt3ConnAck> connectFuture = mqtt3AsyncClient.connect();
            try {
                connectFuture.get(Long.parseLong(mqttProtocol.getTimeout()), TimeUnit.MILLISECONDS);
            } catch (InterruptedException | ExecutionException | TimeoutException e) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(getErrorMessage(e.getMessage()));
            }
        });
        testDescribeAndPublish3(client, mqttProtocol, data);
        convertToMetricsData(builder, metrics, responseTime, data);
        client.disconnect();
    }

    private void testDescribeAndPublish3(Mqtt3AsyncClient client, MqttProtocol mqttProtocol, Map<Object, String> data) {
        data.put("canDescribe", test(() -> {
            client.subscribeWith().topicFilter(mqttProtocol.getTopic()).qos(MqttQos.AT_LEAST_ONCE).send();
            client.unsubscribeWith().topicFilter(mqttProtocol.getTopic()).send();
        }, "subscribe").toString());

        data.put("canPublish", !mqttProtocol.testPublish() ? Boolean.FALSE.toString() : test(() -> {
            client.publishWith().topic(mqttProtocol.getTopic())
                .payload(mqttProtocol.getTestMessage().getBytes(StandardCharsets.UTF_8))
                .qos(MqttQos.AT_LEAST_ONCE).send();
            data.put("canPublish", Boolean.TRUE.toString());
        }, "publish").toString());
    }

    private void testDescribeAndPublish5(Mqtt5AsyncClient client, MqttProtocol mqttProtocol, Map<Object, String> data) {
        data.put("canDescribe", test(() -> {
            client.subscribeWith().topicFilter(mqttProtocol.getTopic()).qos(MqttQos.AT_LEAST_ONCE).send();
            client.unsubscribeWith().topicFilter(mqttProtocol.getTopic()).send();
        }, "subscribe").toString());

        data.put("canPublish", !mqttProtocol.testPublish() ? Boolean.FALSE.toString() : test(() -> {
            client.publishWith().topic(mqttProtocol.getTopic())
                .payload(mqttProtocol.getTestMessage().getBytes(StandardCharsets.UTF_8))
                .qos(MqttQos.AT_LEAST_ONCE).send();
            data.put("canPublish", Boolean.TRUE.toString());
        }, "publish").toString());
    }

    private Mqtt5AsyncClient buildMqtt5Client(MqttProtocol mqttProtocol) {
        Mqtt5ClientBuilder mqtt5ClientBuilder = Mqtt5Client.builder()
            .serverHost(mqttProtocol.getHost())
            .identifier(mqttProtocol.getClientId())
            .serverPort(Integer.parseInt(mqttProtocol.getPort()));

        if (mqttProtocol.hasAuth()) {
            mqtt5ClientBuilder.simpleAuth().username(mqttProtocol.getUsername())
                .password(mqttProtocol.getPassword().getBytes(StandardCharsets.UTF_8))
                .applySimpleAuth();
        }
        return mqtt5ClientBuilder.buildAsync();
    }

    private Mqtt3AsyncClient buildMqtt3Client(MqttProtocol mqttProtocol) {

        Mqtt3ClientBuilder mqtt3ClientBuilder = Mqtt3Client.builder()
            .serverHost(mqttProtocol.getHost())
            .identifier(mqttProtocol.getClientId())
            .serverPort(Integer.parseInt(mqttProtocol.getPort()));

        if (mqttProtocol.hasAuth()) {
            mqtt3ClientBuilder.simpleAuth().username(mqttProtocol.getUsername())
                .password(mqttProtocol.getPassword().getBytes(StandardCharsets.UTF_8))
                .applySimpleAuth();
        }
        return mqtt3ClientBuilder.buildAsync();
    }

    public <T> long connectClient(T client, Consumer<T> connect) {
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        connect.accept(client);
        stopWatch.stop();
        return stopWatch.getTotalTimeMillis();
    }

    private void convertToMetricsData(Builder builder, Metrics metrics, long responseTime, Map<Object, String> data) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String column : metrics.getAliasFields()) {
            if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                valueRowBuilder.addColumns(String.valueOf(responseTime));
            } else {
                String value = data.get(column);
                value = value == null ? CommonConstants.NULL_VALUE : value;
                valueRowBuilder.addColumns(value);
            }
        }
        builder.addValues(valueRowBuilder.build());
    }

    private Boolean test(Runnable runnable, String operationName) {
        try {
            runnable.run();
            return true;
        } catch (Exception e) {
            logger.error("{} fail", operationName, e);
        }
        return false;
    }

    private String getErrorMessage(String errorMessage) {
        if (StringUtils.isBlank(errorMessage)) {
            return "connect failed";
        }
        String[] split = errorMessage.split(":");
        if (split.length > 1) {
            return Arrays.stream(split).skip(1).collect(Collectors.joining(":"));
        }
        return errorMessage;
    }

}
