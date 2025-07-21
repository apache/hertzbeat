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

package org.apache.hertzbeat.collector.collect.jmx;

import java.io.IOException;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import javax.management.Attribute;
import javax.management.AttributeList;
import javax.management.MBeanAttributeInfo;
import javax.management.MBeanFeatureInfo;
import javax.management.MBeanInfo;
import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.ObjectName;
import javax.management.openmbean.CompositeData;
import javax.management.openmbean.CompositeType;
import javax.management.remote.JMXConnector;
import javax.management.remote.JMXConnectorFactory;
import javax.management.remote.JMXServiceURL;
import javax.management.remote.rmi.RMIConnectorServer;
import javax.naming.Context;
import javax.rmi.ssl.SslRMIClientSocketFactory;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.common.cache.JmxConnect;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JmxProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.LogUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

/**
 * jmx protocol acquisition implementation
 */
public class JmxCollectImpl extends AbstractCollect {

    private static final String JMX_URL_PREFIX = "service:jmx:rmi:///jndi/rmi://";

    private static final String JMX_URL_SUFFIX = "/jmxrmi";

    private static final String IGNORED_STUB = "/stub/";

    private static final String SUB_ATTRIBUTE = "->";

    private final GlobalConnectionCache connectionCommonCache = GlobalConnectionCache.getInstance();

    private final ClassLoader jmxClassLoader;

    private static final Logger logger = LoggerFactory.getLogger(JmxCollectImpl.class);

    public JmxCollectImpl() {
        jmxClassLoader = new JmxClassLoader(ClassLoader.getSystemClassLoader());
    }

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        Assert.isTrue(metrics != null && metrics.getJmx() != null, "JMX collect must have JMX params");
        JmxProtocol jmxProtocol = metrics.getJmx();

        // Validate JMX URL if provided
        String url = jmxProtocol.getUrl();
        if (StringUtils.hasText(url)) {
            Assert.doesNotContain(url, IGNORED_STUB, "JMX url prohibit contains stub, please check");

            // Prevent JNDI injection by validating URL format
            validateJmxUrl(url);
        } else {
            // Validate host and port inputs
            String host = jmxProtocol.getHost();
            int port = Integer.parseInt(jmxProtocol.getPort());

            // Validate host format (only allow valid hostnames or IP addresses)
            Assert.isTrue(isValidHostname(host), "Invalid hostname format");
            Assert.isTrue(port > 0 && port <= 65535, "Port must be between 1 and 65535");
        }
    }

    /**
     * Validate JMX URL 
     * 
     * @param url JMX URL to validate
     * @throws IllegalArgumentException if URL is potentially malicious
     */
    private void validateJmxUrl(String url) throws IllegalArgumentException {
        // Only allow service:jmx:rmi protocol
        Assert.isTrue(url.startsWith("service:jmx:rmi:"), "Only service:jmx:rmi protocol is supported");

        String[] disallowedPatterns = { "ldap:", "rmi:", "iiop:", "nis:", "dns:", "corbaname:", "http:", "https:" };
        for (String pattern : disallowedPatterns) {
            if (url.contains(pattern) && !pattern.equals("rmi:///jndi/rmi:")) {
                throw new IllegalArgumentException("Potentially unsafe JNDI protocol detected in URL: " + pattern);
            }
        }

        // Check for suspicious patterns
        if (url.contains("${") || url.contains("$[") || url.contains(":#") || url.contains(":/")) {
            throw new IllegalArgumentException("Potentially malicious pattern detected in JMX URL");
        }
    }

    /**
     * Validate hostname format 
     * 
     * @param hostname Hostname to validate
     * @return true if hostname is valid
     */
    private boolean isValidHostname(String hostname) {
        if (hostname == null || hostname.isEmpty()) {
            return false;
        }

        // Simplified hostname/IP validation regex
        // This regex accepts valid hostnames, IPv4 and IPv6 addresses
        String hostnameRegex = "^([a-zA-Z0-9][-a-zA-Z0-9]*\\.)+[a-zA-Z0-9][-a-zA-Z0-9]*$|^(\\d{1,3}\\.){3}\\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$";
        return hostname.matches(hostnameRegex);
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        ClassLoader currentClassLoader = Thread.currentThread().getContextClassLoader();
        Thread.currentThread().setContextClassLoader(jmxClassLoader);
        try {
            JmxProtocol jmxProtocol = metrics.getJmx();
            // Whether to use customized JMX
            MbeanProcessor processor = null;
            if (CustomizedJmxFactory.validate(builder.getApp(), jmxProtocol.getObjectName())) {
                processor = CustomizedJmxFactory.getProcessor(builder.getApp(), jmxProtocol.getObjectName());
                if (processor != null) {
                    processor.preProcess(builder, metrics);
                    if (processor.isCollectionComplete()) {
                        return;
                    }
                }
            }
            // Create a jndi remote connection
            JMXConnector jmxConnector = getConnectSession(jmxProtocol);
            MBeanServerConnection serverConnection = jmxConnector.getMBeanServerConnection();
            ObjectName objectName = new ObjectName(jmxProtocol.getObjectName());

            Set<String> attributeNameSet = metrics.getAliasFields().stream()
                    .map(field -> field.split(SUB_ATTRIBUTE)[0]).collect(Collectors.toSet());
            Set<ObjectInstance> objectInstanceSet = serverConnection.queryMBeans(objectName, null);
            for (ObjectInstance objectInstance : objectInstanceSet) {
                ObjectName currentObjectName = objectInstance.getObjectName();
                MBeanInfo beanInfo = serverConnection.getMBeanInfo(currentObjectName);
                MBeanAttributeInfo[] attrInfos = beanInfo.getAttributes();
                String[] attributes = new String[attributeNameSet.size()];
                attributes = Arrays.stream(attrInfos)
                        .filter(item -> item.isReadable() && attributeNameSet.contains(item.getName()))
                        .map(MBeanFeatureInfo::getName)
                        .toList().toArray(attributes);
                AttributeList attributeList = serverConnection.getAttributes(currentObjectName, attributes);

                Map<String, String> attributeValueMap = extractAttributeValue(attributeList);
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                if (processor != null) {
                    processor.process(serverConnection, objectInstance, objectInstanceSet,
                            currentObjectName, attributeValueMap, valueRowBuilder);
                }
                for (String aliasField : metrics.getAliasFields()) {
                    String fieldValue = attributeValueMap.get(aliasField);
                    valueRowBuilder.addColumn(fieldValue != null ? fieldValue : CommonConstants.NULL_VALUE);
                }
                builder.addValueRow(valueRowBuilder.build());
                if (processor != null && processor.isCollectionComplete()) {
                    return;
                }
            }
        } catch (IOException exception) {
            String errorMsg = CommonUtil.getMessageFromThrowable(exception);
            LogUtil.error(logger, "JMX IOException: {0}", errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            LogUtil.error(logger, "JMX Error: {0}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            Thread.currentThread().setContextClassLoader(currentClassLoader);
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
                LogUtil.info(logger, "attribute {0} value is null.", attribute.getName());
                continue;
            }
            if (value instanceof Number || value instanceof String || value instanceof ObjectName
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
                LogUtil.warn(logger, "attribute value type {0} not support.", value.getClass().getName());
            }
        }
        return attributeValueMap;
    }

    private JMXConnector getConnectSession(JmxProtocol jmxProtocol) throws IOException {
        CacheIdentifier identifier = CacheIdentifier.builder().ip(jmxProtocol.getHost())
                .port(jmxProtocol.getPort()).username(jmxProtocol.getUsername())
                .password(jmxProtocol.getPassword()).build();
        Optional<AbstractConnection<?>> cacheOption = connectionCommonCache.getCache(identifier, true);
        JMXConnector conn = null;
        if (cacheOption.isPresent()) {
            JmxConnect jmxConnect = (JmxConnect) cacheOption.get();
            conn = jmxConnect.getConnection();
            try {
                conn.getMBeanServerConnection();
            } catch (Exception e) {
                conn = null;
                connectionCommonCache.removeCache(identifier);
            }
        }
        if (conn != null) {
            return conn;
        }
        String url;
        if (jmxProtocol.getUrl() != null) {
            url = jmxProtocol.getUrl();
            // Double check URL format for security
            if (!url.startsWith("service:jmx:rmi:")) {
                throw new IOException("Unsupported JMX URL protocol. Only service:jmx:rmi: is allowed.");
            }
        } else {
            // More strict formatting with proper escaping
            String host = jmxProtocol.getHost();
            int port = Integer.parseInt(jmxProtocol.getPort());

            // Additional validation at connection time
            if (!isValidHostname(host)) {
                throw new IOException("Invalid hostname format for JMX connection: " + host);
            }
            if (port <= 0 || port > 65535) {
                throw new IOException("Invalid port for JMX connection: " + port);
            }

            url = JMX_URL_PREFIX + host + ":" + port + JMX_URL_SUFFIX;
        }

        // Set security properties to prevent remote class loading
        System.setProperty("com.sun.jndi.rmi.object.trustURLCodebase", "false");
        System.setProperty("com.sun.jndi.cosnaming.object.trustURLCodebase", "false");

        Map<String, Object> environment = new HashMap<>(4);
        if (StringUtils.hasText(jmxProtocol.getUsername()) && StringUtils.hasText(jmxProtocol.getPassword())) {
            String[] credential = new String[] { jmxProtocol.getUsername(), jmxProtocol.getPassword() };
            environment.put(javax.management.remote.JMXConnector.CREDENTIALS, credential);
        }
        if (Boolean.TRUE.toString().equals(jmxProtocol.getSsl())) {
            environment.put(Context.SECURITY_PROTOCOL, "ssl");
            SslRMIClientSocketFactory clientSocketFactory = new SslRMIClientSocketFactory();
            environment.put(RMIConnectorServer.RMI_CLIENT_SOCKET_FACTORY_ATTRIBUTE, clientSocketFactory);
            environment.put("com.sun.jndi.rmi.factory.socket", clientSocketFactory);
        }

        // Limit JMX connection timeout
        environment.put("jmx.remote.x.client.connection.timeout", 10000);
        environment.put("jmx.remote.x.server.connection.timeout", 10000);

        try {
            JMXServiceURL jmxServiceUrl = new JMXServiceURL(url);
            conn = JMXConnectorFactory.connect(jmxServiceUrl, environment);
            connectionCommonCache.addCache(identifier, new JmxConnect(conn));
            return conn;
        } catch (Exception e) {
            LogUtil.error(logger, "Failed to connect to JMX connection: {0}", e.getMessage());
            throw new IOException("Failed to connect to JMX server: " + e.getMessage(), e);
        }
    }

}
