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


import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttClientPersistence;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.Assert;
import org.springframework.util.StopWatch;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * collect mqtt metrics using Eclipse Paho
 */
public class MqttCollectImpl extends AbstractCollect {

    public MqttCollectImpl() {
    }

    private static final Logger logger = LoggerFactory.getLogger(MqttCollectImpl.class);

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MQTT;
    }

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        MqttProtocol mqttProtocol = metrics.getMqtt();
        Assert.hasText(mqttProtocol.getHost(), "MQTT protocol host is required");
        Assert.hasText(mqttProtocol.getPort(), "MQTT protocol port is required");

        if ("mqtts".equalsIgnoreCase(mqttProtocol.getProtocol())) {
            if (Boolean.parseBoolean(mqttProtocol.getEnableMutualAuth())) {
                Assert.hasText(mqttProtocol.getCaCert(), "CA certificate is required for mutual auth");
                Assert.hasText(mqttProtocol.getClientCert(), "Client certificate is required for mutual auth");
                Assert.hasText(mqttProtocol.getClientKey(), "Client private key is required for mutual auth");
            }
        }
    }

    @Override
    public void collect(Builder builder, Metrics metrics) {
        MqttProtocol mqttProtocol = metrics.getMqtt();
        Map<Object, String> data = new HashMap<>();

        try {
            MqttAsyncClient client = buildMqttClient(mqttProtocol);
            long responseTime = connectClient(client, mqttProtocol);
            testSubscribeAndPublish(client, mqttProtocol, data);
            convertToMetricsData(builder, metrics, responseTime, data);
            client.disconnect();
        } catch (Exception e) {
            logger.error("MQTT collection error: {}", e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Collection failed: " + e.getMessage());
        }
    }

    private MqttAsyncClient buildMqttClient(MqttProtocol protocol) throws Exception {
        String clientId = protocol.getClientId();

        String serverUri = String.format("%s://%s:%s",
                StringUtils.equals(protocol.getProtocol(), "MQTT") ? "tcp" : "ssl",
                protocol.getHost(),
                protocol.getPort());

        MqttClientPersistence persistence = new MemoryPersistence();

        return new MqttAsyncClient(serverUri, clientId, persistence);
    }

    private long connectClient(MqttAsyncClient client, MqttProtocol protocol) throws Exception {
        MqttConnectOptions connOpts = new MqttConnectOptions();

        if (protocol.hasAuth()) {
            connOpts.setUserName(protocol.getUsername());
            connOpts.setPassword(protocol.getPassword().toCharArray());
        }

        connOpts.setKeepAliveInterval(Integer.parseInt(protocol.getKeepalive()));
        connOpts.setConnectionTimeout(Integer.parseInt(protocol.getTimeout()) / 1000);
        connOpts.setCleanSession(true);
        connOpts.setAutomaticReconnect(false);
        if ("mqtts".equalsIgnoreCase(protocol.getProtocol())) {
            boolean insecureSkipVerify = Boolean.parseBoolean(protocol.getInsecureSkipVerify());
            if (insecureSkipVerify) {
                connOpts.setHttpsHostnameVerificationEnabled(false);
            }
            if (Boolean.parseBoolean(protocol.getEnableMutualAuth())) {
                connOpts.setSocketFactory(MqttSslFactory.getMslSocketFactory(protocol, insecureSkipVerify));
            } else {
                connOpts.setSocketFactory(MqttSslFactory.getSslSocketFactory(protocol, insecureSkipVerify));
            }
        }


        StopWatch connectWatch = new StopWatch();
        connectWatch.start();

        client.connect(connOpts).waitForCompletion(Long.parseLong(protocol.getTimeout()));
        connectWatch.stop();
        return connectWatch.getTotalTimeMillis();
    }


    /**
     * Test MQTT subscribe and publish capabilities
     */
    private void testSubscribeAndPublish(MqttAsyncClient client, MqttProtocol protocol, Map<Object, String> data) {

        // 1 test subscribe
        if (StringUtils.isNotBlank(protocol.getTopic())) {
            String subscribe = testSubscribe(client, protocol.getTopic());
            if (StringUtils.isBlank(subscribe)) {
                data.put("canSubscribe", "Subscription successful");
            } else {
                data.put("canSubscribe", String.format("Subscription failed: %s", subscribe));
            }

        } else {
            data.put("canSubscribe", "No topic, subscription test skipped");
        }


        // 2 test publish
        if (StringUtils.isNotBlank(protocol.getTestMessage())) {
            String publish = testPublish(client, protocol.getTopic(), protocol.getTestMessage());
            if (StringUtils.isBlank(publish)) {
                data.put("canPublish", "Message published successfully");

                // 3 test receive message
                String receivedData = getReceivedData(client, protocol.getTopic());
                data.put("canReceive", receivedData);
            } else {
                data.put("canPublish", String.format("Message publishing failed: %s", publish));
                data.put("canReceive", "Message reception skipped due to failed publish");
            }
        } else {
            data.put("canPublish", "No test message, publish test skipped");
            data.put("canReceive", "No test message, receive test skipped");
        }


        // 4 test unsubscribe
        if (StringUtils.isNotBlank(protocol.getTopic())) {
            String subscribe = testUnSubscribe(client, protocol.getTopic());
            if (StringUtils.isBlank(subscribe)) {
                data.put("canUnSubscribe", "Unsubscription successful");
            } else {
                data.put("canUnSubscribe", String.format("Unsubscription failed: %s", subscribe));
            }
        } else {
            data.put("canUnSubscribe", "No topic, unsubscription test skipped");
        }
    }

    private String getReceivedData(MqttAsyncClient client, String topic) {
        final CountDownLatch latch = new CountDownLatch(1);
        final StringBuilder messageHolder = new StringBuilder();


        client.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                latch.countDown();
            }

            @Override
            public void messageArrived(String arrivedTopic, MqttMessage message) {

                if (topic.equals(arrivedTopic)) {
                    messageHolder.append(new String(message.getPayload()));
                    latch.countDown();
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
            }
        });

        try {
            boolean received = latch.await(5, TimeUnit.SECONDS);
            if (messageHolder.length() > 0) {
                return messageHolder.toString();
            } else if (!received) {
                return "Message reception timed out after 5 seconds";
            } else {
                return "No valid message received";
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return e.getMessage();
        } finally {
            client.setCallback(null);
        }
    }

    private String testSubscribe(MqttAsyncClient client, String topic) {
        try {
            IMqttToken subToken = client.subscribe(topic, 1);
            subToken.waitForCompletion(5000);
            return "";
        } catch (MqttException e) {
            logger.warn("MQTT subscribe test failed: {}", e.getMessage());
            return e.getMessage();
        }
    }

    private String testPublish(MqttAsyncClient client, String topic, String message) {
        try {
            MqttMessage mqttMessage = new MqttMessage(message.getBytes());
            mqttMessage.setQos(1);

            IMqttToken pubToken = client.publish(topic, mqttMessage);
            pubToken.waitForCompletion(5000);

            return "";
        } catch (MqttException e) {
            logger.warn("MQTT publish test failed: {}", e.getMessage());
            return e.getMessage();
        }
    }

    private String testUnSubscribe(MqttAsyncClient client, String topic) {
        try {
            IMqttToken unsubToken = client.unsubscribe(topic);
            unsubToken.waitForCompletion(5000);
            return "";
        } catch (MqttException e) {
            logger.warn("MQTT unsubscribe test failed: {}", e.getMessage());
            return e.getMessage();
        }
    }

    /**
     * Convert collected data to MetricsData
     */
    private void convertToMetricsData(Builder builder, Metrics metrics, long responseTime, Map<Object, String> data) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String column : metrics.getAliasFields()) {
            if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                valueRowBuilder.addColumn(String.valueOf(responseTime));
            } else {
                String value = data.get(column);
                value = value == null ? CommonConstants.NULL_VALUE : value;
                valueRowBuilder.addColumn(value);
            }
        }
        builder.addValueRow(valueRowBuilder.build());
    }

}
