package com.usthe.collector.collect.jmx;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.JmxConnect;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.JmxProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;

import javax.management.*;
import javax.management.openmbean.CompositeDataSupport;
import javax.management.remote.*;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * jmx 协议采集实现 - jmx
 * jmx protocol acquisition implementation
 *
 *
 *
 */
@Slf4j
public class JmxCollectImpl extends AbstractCollect {

    private static final String JMX_URL_PREFIX = "service:jmx:rmi:///jndi/rmi://";

    private static final String JMX_URL_SUFFIX = "/jmxrmi";

    private JmxCollectImpl() {
    }

    public static JmxCollectImpl getInstance() {
        return Singleton.INSTANCE;
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) throws IOException {
        //Get the address and port from the jmx carried by Metrics
        //从Metrics携带的jmx中拿到地址  端口

        try {
            JmxProtocol jmxProtocol = metrics.getJmx();

            //Create a jndi remote connection
            //创建一个jndi远程连接
            JMXConnector conn = getConnectSession(jmxProtocol);

            MBeanServerConnection jmxBean = conn.getMBeanServerConnection();
            ObjectName objectName = new ObjectName(jmxProtocol.getObjectName());
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();

            //Whether there is a second level of nesting
            //是否存在二级嵌套
            if (jmxProtocol.getAttributeName() != null) {
                String attributeName = jmxProtocol.getAttributeName();
                Object attribute = jmxBean.getAttribute(objectName, attributeName);
                CompositeDataSupport support = null;
                if (attribute instanceof CompositeDataSupport) {
                    support = (CompositeDataSupport) attribute;
                }
                CompositeDataSupport finalSupport = support;
                metrics.getFields().forEach(field -> {
                    assert finalSupport != null;
                    Object fieldValue = finalSupport.get(field.getField());
                    if (fieldValue != null) {
                        valueRowBuilder.addColumns(fieldValue.toString());
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                });
            } else {
                String[] attributes = new String[metrics.getAliasFields().size()];
                attributes = metrics.getAliasFields().toArray(attributes);
                AttributeList attributeList = jmxBean.getAttributes(objectName, attributes);
                Map<String, Object> map = attributeList.asList().stream().collect(Collectors.toMap(Attribute::getName, Attribute::getValue));
                for (String attribute : attributes) {
                    Object attributeValue = map.get(attribute);
                    valueRowBuilder.addColumns(attributeValue != null ? attributeValue.toString() : CommonConstants.NULL_VALUE);
                }
            }
            builder.addValues(valueRowBuilder.build());
        } catch (IOException exception) {
            log.error("JMX IOException :{}", exception.getMessage());
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(exception.getMessage());
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            log.error("JMX Error :{}", e.getMessage());
        }
    }

    private JMXConnector getConnectSession(JmxProtocol jmxProtocol) throws IOException {
        CacheIdentifier identifier = CacheIdentifier.builder().ip(jmxProtocol.getHost())
                .port(jmxProtocol.getPort()).username(jmxProtocol.getUsername())
                .password(jmxProtocol.getPassword()).build();
        Optional<Object> cacheOption = CommonCache.getInstance().getCache(identifier, true);
        JMXConnector conn = null;
        if (cacheOption.isPresent()) {
            JmxConnect jmxConnect = (JmxConnect) cacheOption.get();
            conn = jmxConnect.getConnection();
            try {
                conn.getMBeanServerConnection();
            } catch (Exception e) {
                conn = null;
                CommonCache.getInstance().removeCache(identifier);
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
        JMXServiceURL jmxServiceUrl = new JMXServiceURL(url);
        conn = JMXConnectorFactory.connect(jmxServiceUrl);
        CommonCache.getInstance().addCache(identifier, new JmxConnect(conn));
        return conn;
    }

    private static class Singleton {
        private static final JmxCollectImpl INSTANCE = new JmxCollectImpl();
    }

}
