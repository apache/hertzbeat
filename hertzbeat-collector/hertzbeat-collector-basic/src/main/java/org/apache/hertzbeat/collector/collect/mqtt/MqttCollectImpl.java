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
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.Assert;
import org.springframework.util.StopWatch;

import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
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

        // 校验SSL相关参数
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

        // 构造MQTT服务URI

        String serverUri = String.format("%s://%s:%s",
                StringUtils.equals(protocol.getProtocol(), "MQTT") ? "tcp" : "ssl",
                protocol.getHost(),
                protocol.getPort());

        // 使用内存持久化（无需磁盘存储）
        MqttClientPersistence persistence = new MemoryPersistence();

        return new MqttAsyncClient(serverUri, clientId, persistence);
    }

    private long connectClient(MqttAsyncClient client, MqttProtocol protocol) throws Exception {
        MqttConnectOptions connOpts = new MqttConnectOptions();

        // 设置认证信息
        if (protocol.hasAuth()) {
            connOpts.setUserName(protocol.getUsername());
            connOpts.setPassword(protocol.getPassword().toCharArray());
        }

        // 设置心跳保活（秒）
        connOpts.setKeepAliveInterval(Integer.parseInt(protocol.getKeepalive()));
        connOpts.setConnectionTimeout(Integer.parseInt(protocol.getTimeout())/1000);
        connOpts.setCleanSession(true);
        connOpts.setAutomaticReconnect(false);
        //  配置SSL/TLS
        if ("mqtts".equalsIgnoreCase(protocol.getProtocol())) {
            boolean insecureSkipVerify = Boolean.parseBoolean(protocol.getInsecureSkipVerify());
            if (insecureSkipVerify){
                connOpts.setHttpsHostnameVerificationEnabled(false);
            }
            if (Boolean.parseBoolean(protocol.getEnableMutualAuth())){
                connOpts.setSocketFactory(MqttSSLFactory.getMSLSocketFactory(protocol,insecureSkipVerify));
            }else {
                connOpts.setSocketFactory(MqttSSLFactory.getSSLSocketFactory(protocol,insecureSkipVerify));
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
    private void testSubscribeAndPublish(MqttAsyncClient client, MqttProtocol protocol, Map<Object, String> data){

        // 1 测试订阅功能
        if (StringUtils.isNotBlank(protocol.getTopic())) {
            String subscribe = testSubscribe(client, protocol.getTopic());
            if (StringUtils.isBlank(subscribe)){
                data.put("canSubscribe", "订阅成功");
            }else {
                data.put("canSubscribe", String.format("订阅失败：{}", subscribe));
            }

        } else {
            data.put("canSubscribe", "没有Topic，不测试订阅");
        }


        // 2 测试发布功能
        if (StringUtils.isNotBlank(protocol.getTestMessage())) {
            String publish = testPublish(client, protocol.getTopic(), protocol.getTestMessage());
            if (StringUtils.isBlank(publish)){
                data.put("canPublish", "发布成功");

                // 3 获取数据
                String receivedData = getReceivedData(client, protocol.getTopic());
                data.put("canReceive", receivedData);
            }else {
                data.put("canPublish", String.format("发布失败：{}", publish));
                data.put("canReceive", "发布失败，不测试接收数据");
            }
        } else {
            data.put("canPublish", "没有测试数据，不测试发布");
            data.put("canReceive", "没有测试数据，不测试接收数据");
        }



        // 4测试取消订阅
        if (StringUtils.isNotBlank(protocol.getTopic())) {
            String subscribe = testUnSubscribe(client, protocol.getTopic());
            if (StringUtils.isBlank(subscribe)){
                data.put("canUnSubscribe", "取消成功");
            }else {
                data.put("canUnSubscribe", String.format("取消失败：{}", subscribe));
            }
        } else {
            data.put("canUnSubscribe", "没有Topic，不测试取消订阅");
        }
    }

    private String getReceivedData(MqttAsyncClient client, String topic) {
        final CountDownLatch latch = new CountDownLatch(1); // 同步锁（计数1）
        final StringBuilder messageHolder = new StringBuilder(); // 存储接收的消息

        // 设置临时消息回调
        client.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                latch.countDown(); // 连接丢失时释放锁
            }

            @Override
            public void messageArrived(String arrivedTopic, MqttMessage message) {
                // 仅处理目标主题的消息
                if (topic.equals(arrivedTopic)) {
                    messageHolder.append(new String(message.getPayload()));
                    latch.countDown(); // 成功接收后释放锁
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {
                // 发布完成，不处理
            }
        });

        try {
            // 等待消息（最多5秒）
            boolean received = latch.await(5, TimeUnit.SECONDS);
            if (messageHolder.length() > 0) {
                return messageHolder.toString(); // 返回消息内容
            } else if (!received) {
                return "等待接收消息超时5s"; // 超时提示
            } else {
                return "未收到有效消息"; // 无消息提示
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // 恢复中断状态
            return e.getMessage();
        } finally {
            client.setCallback(null); // 恢复原始回调
        }
    }

    private String testSubscribe(MqttAsyncClient client, String topic) {
        try {
            // 订阅主题
            IMqttToken subToken = client.subscribe(topic, 1);
            subToken.waitForCompletion(5000);
            return "";
        } catch (MqttException e) {
            logger.warn("MQTT subscribe test failed: {}", e.getMessage());
            return e.getMessage();
        }
    }

    private String testPublish(MqttAsyncClient client, String topic, String message){
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


    private String testUnSubscribe(MqttAsyncClient client, String topic){
        try {
            // 订阅主题
            IMqttToken unsubToken = client.unsubscribe(topic);
            unsubToken.waitForCompletion(5000);
            return "";
        } catch (MqttException e) {
            logger.warn("MQTT unsubscribe test failed: {}", e.getMessage());
            return e.getMessage();
        }
    }



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
