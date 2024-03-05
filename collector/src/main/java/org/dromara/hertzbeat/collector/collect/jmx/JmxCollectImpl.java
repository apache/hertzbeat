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

package org.dromara.hertzbeat.collector.collect.jmx;

import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.dromara.hertzbeat.collector.collect.common.cache.ConnectionCommonCache;
import org.dromara.hertzbeat.collector.collect.common.cache.JmxConnect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.JmxProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;

import javax.management.*;
import javax.management.openmbean.CompositeData;
import javax.management.openmbean.CompositeType;
import javax.management.remote.*;
import javax.management.remote.rmi.RMIConnectorServer;
import javax.naming.Context;
import javax.rmi.ssl.SslRMIClientSocketFactory;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * jmx protocol acquisition implementation
 * @author huacheng
 */
@Slf4j
public class JmxCollectImpl extends AbstractCollect {

    private static final String JMX_URL_PREFIX = "service:jmx:rmi:///jndi/rmi://";

    private static final String JMX_URL_SUFFIX = "/jmxrmi";
    
    private static final String IGNORED_STUB = "/stub/";

    private static final String SUB_ATTRIBUTE = "->";

    public JmxCollectImpl() {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {

        try {
            JmxProtocol jmxProtocol = metrics.getJmx();
            validateParams(metrics);

            // Create a jndi remote connection
            JMXConnector jmxConnector = getConnectSession(jmxProtocol);

            MBeanServerConnection serverConnection = jmxConnector.getMBeanServerConnection();
            ObjectName objectName = new ObjectName(jmxProtocol.getObjectName());

            Set<ObjectInstance> objectInstanceSet = serverConnection.queryMBeans(objectName, null);
            Set<String> attributeNameSet = metrics.getAliasFields().stream()
                    .map(field -> field.split(SUB_ATTRIBUTE)[0]).collect(Collectors.toSet());
            for (ObjectInstance objectInstance : objectInstanceSet) {
                ObjectName currentObjectName = objectInstance.getObjectName();
                MBeanInfo beanInfo = serverConnection.getMBeanInfo(currentObjectName);
                MBeanAttributeInfo[] attrInfos = beanInfo.getAttributes();
                String[] attributes = new String[attributeNameSet.size()];
                attributes = Arrays.stream(attrInfos)
                        .filter(item -> item.isReadable() && attributeNameSet.contains(item.getName()))
                        .map(MBeanFeatureInfo::getName)
                        .collect(Collectors.toList()).toArray(attributes);
                AttributeList attributeList = serverConnection.getAttributes(currentObjectName, attributes);

                Map<String, String> attributeValueMap = extractAttributeValue(attributeList);
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String aliasField : metrics.getAliasFields()) {
                    String fieldValue = attributeValueMap.get(aliasField);
                    valueRowBuilder.addColumns(fieldValue != null ? fieldValue : CommonConstants.NULL_VALUE);
                }
                builder.addValues(valueRowBuilder.build());
            }
        } catch (IOException exception) {
            String errorMsg = CommonUtil.getMessageFromThrowable(exception);
            log.error("JMX IOException :{}", errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error("JMX Error :{}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_JMX;
    }

    private Map<String, String> extractAttributeValue(AttributeList attributeList) {
        if (attributeList == null || attributeList.isEmpty()) {
            throw new RuntimeException("attributeList is empty");
        }
        Map<String, String> attributeValueMap = new HashMap<>(attributeList.size());
        for (Attribute attribute : attributeList.asList()) {
            Object value = attribute.getValue();
            if (value == null) {
                log.info("attribute {} value is null.", attribute.getName());
                continue;
            }
            if (value instanceof Number || value instanceof  String || value instanceof ObjectName
                    || value instanceof Boolean || value instanceof Date || value instanceof TimeUnit) {
                attributeValueMap.put(attribute.getName(), value.toString());
            } else if (value instanceof CompositeData) {
                CompositeData compositeData = (CompositeData) value;
                CompositeType compositeType = compositeData.getCompositeType();
                for (String typeKey : compositeType.keySet()) {
                    Object fieldValue = compositeData.get(typeKey);
                    attributeValueMap.put(attribute.getName() + SUB_ATTRIBUTE + typeKey, fieldValue.toString());
                }
            } else if (value instanceof String[]) {
                String[] values = (String[]) value;
                StringBuilder builder = new StringBuilder();
                for (int index = 0; index < values.length; index++) {
                    builder.append(values[index]);
                    if (index < values.length - 1) {
                        builder.append(",");
                    }
                }
                attributeValueMap.put(attribute.getName(), builder.toString());
            } else {
                log.warn("attribute value type {} not support.", value.getClass().getName());
            }
        }
        return attributeValueMap;
    }

    private void validateParams(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getJmx() == null) {
            throw new IllegalArgumentException("JMX collect must has jmx params");
        }
        if (StringUtils.hasText(metrics.getJmx().getUrl())) {
            if (metrics.getJmx().getUrl().contains(IGNORED_STUB)) {
                throw new IllegalArgumentException("JMX url prohibit contains stub, please check");
            }
        }
    }

    private JMXConnector getConnectSession(JmxProtocol jmxProtocol) throws IOException {
        CacheIdentifier identifier = CacheIdentifier.builder().ip(jmxProtocol.getHost())
                .port(jmxProtocol.getPort()).username(jmxProtocol.getUsername())
                .password(jmxProtocol.getPassword()).build();
        Optional<Object> cacheOption = ConnectionCommonCache.getInstance().getCache(identifier, true);
        JMXConnector conn = null;
        if (cacheOption.isPresent()) {
            JmxConnect jmxConnect = (JmxConnect) cacheOption.get();
            conn = jmxConnect.getConnection();
            try {
                conn.getMBeanServerConnection();
            } catch (Exception e) {
                conn = null;
                ConnectionCommonCache.getInstance().removeCache(identifier);
            }
        }
        if (conn != null) {
            return conn;
        }
        String url;
        if (jmxProtocol.getUrl() != null) {
            url = jmxProtocol.getUrl();
        } else {
            url = JMX_URL_PREFIX + jmxProtocol.getHost() + ":" + jmxProtocol.getPort() + JMX_URL_SUFFIX;
        }
        Map<String, Object> environment = new HashMap<>(4);
        if (StringUtils.hasText(jmxProtocol.getUsername()) && StringUtils.hasText(jmxProtocol.getPassword())) {
            String[] credential = new String[] {jmxProtocol.getUsername(), jmxProtocol.getPassword()};
            environment.put(javax.management.remote.JMXConnector.CREDENTIALS, credential);
        }
        if (Boolean.TRUE.toString().equals(jmxProtocol.getSsl())) {
            environment.put(Context.SECURITY_PROTOCOL, "ssl");
            SslRMIClientSocketFactory clientSocketFactory = new SslRMIClientSocketFactory();
            environment.put(RMIConnectorServer.RMI_CLIENT_SOCKET_FACTORY_ATTRIBUTE, clientSocketFactory);
            environment.put("com.sun.jndi.rmi.factory.socket", clientSocketFactory);
        }
        JMXServiceURL jmxServiceUrl = new JMXServiceURL(url);
        conn = JMXConnectorFactory.connect(jmxServiceUrl, environment);
        ConnectionCommonCache.getInstance().addCache(identifier, new JmxConnect(conn));
        return conn;
    }

}
