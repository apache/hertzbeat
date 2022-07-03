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
import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * jmx 协议采集实现 - ping
 *
 * @author huacheng
 * @date 2022/6/21 15:09
 */
@Slf4j
public class JmxCollectImpl extends AbstractCollect {

    private final static String JMX_URL_PREFIX = "service:jmx:rmi:///jndi/rmi://";

    private final static String JMX_URL_SUFFIX = "/jmxrmi";

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
            String attributeName;
            if (jmxProtocol.getAttributeName() != null) {
                attributeName = jmxProtocol.getAttributeName();
                Object attribute = jmxBean.getAttribute(objectName, attributeName);
                CompositeDataSupport support = null;
                if (attribute instanceof CompositeDataSupport) {
                    support = (CompositeDataSupport) attribute;
                }
                CompositeDataSupport finalSupport = support;
                metrics.getFields().forEach(field -> {
                    if (finalSupport.get(field.getField()) != null) {
                        valueRowBuilder.addColumns(finalSupport.get(field.getField()).toString());
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                });
            } else {
                List<String> attributeNames = metrics.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList());
                List<Object> value = new ArrayList<>();
                attributeNames.forEach(data -> {
                    try {
                        Object attributeValue = jmxBean.getAttribute(objectName, data);
                        value.add(attributeValue != null ? attributeValue : CommonConstants.NULL_VALUE);
                    } catch (Exception e) {
                        log.error("JMX value Error ：{}", e.getMessage());
                    }
                });
                for (int i = 0; i < metrics.getFields().size(); i++) {
                    // todo 查不到值的情况 需要置为 CommonConstants.NULL_VALUE
                    valueRowBuilder.addColumns(value.get(i).toString());
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
            if (conn == null) {
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
        JMXServiceURL jmxServiceURL = new JMXServiceURL(url);
        conn = JMXConnectorFactory.connect(jmxServiceURL);
        CommonCache.getInstance().addCache(identifier, new JmxConnect(conn));
        return conn;
    }

    private static class Singleton {
        private static final JmxCollectImpl INSTANCE = new JmxCollectImpl();
    }

}
