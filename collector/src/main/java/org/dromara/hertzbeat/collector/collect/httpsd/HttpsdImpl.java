package org.dromara.hertzbeat.collector.collect.httpsd;

import com.ecwid.consul.transport.TransportException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClientManagement;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ServerInfo;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.HttpsdProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;

import java.lang.reflect.Field;
import java.util.Objects;

/**
 * http_sd protocol collection implementation
 *
 */
@Slf4j
public class HttpsdImpl extends AbstractCollect {
    private final static String SERVER = "server";
    private final DiscoveryClientManagement discoveryClientManagement = new DiscoveryClientManagement();

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        HttpsdProtocol httpsdProtocol = metrics.getHttpsd();
        // check params
        if (checkParamsFailed(httpsdProtocol)) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("http_sd collect must have a valid http_sd protocol param! ");
            return;
        }

        try (DiscoveryClient discoveryClient = discoveryClientManagement.getClient(httpsdProtocol)) {
            collectMetrics(builder, metrics, discoveryClient);
        } catch (TransportException e1) {
            String errorMsg = "Consul " + CommonUtil.getMessageFromThrowable(e1);
            log.error(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    private void collectMetrics(CollectRep.MetricsData.Builder builder, Metrics metrics, DiscoveryClient discoveryClient) {
        long beginTime = System.currentTimeMillis();
        // Available and Server monitor
        if (StringUtils.equals(metrics.getName(), SERVER)) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            ServerInfo serverInfo = discoveryClient.getServerInfo();
            metrics.getAliasFields().forEach(fieldName -> {
                if (StringUtils.equalsAnyIgnoreCase(CollectorConstants.RESPONSE_TIME, fieldName)) {
                    valueRowBuilder.addColumns(String.valueOf(System.currentTimeMillis() - beginTime));
                }else {
                    addColumnIfMatched(fieldName, serverInfo, valueRowBuilder);
                }
            });

            builder.addValues(valueRowBuilder.build());
        }else {
            // Service instances monitor
            discoveryClient.getServices().forEach(serviceInstance -> {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                metrics.getAliasFields().forEach(fieldName -> addColumnIfMatched(fieldName, serviceInstance, valueRowBuilder));
                builder.addValues(valueRowBuilder.build());
            });
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_HTTP_SD;
    }

    private boolean checkParamsFailed(HttpsdProtocol httpsd) {
        return Objects.isNull(httpsd) || httpsd.isInvalid();
    }

    private void addColumnIfMatched(String fieldName, Object sourceObj, CollectRep.ValueRow.Builder valueRowBuilder) {
        String columnValue = null;
        try {
            Field declaredField = sourceObj.getClass().getDeclaredField(fieldName);
            declaredField.setAccessible(Boolean.TRUE);
            columnValue = (String) declaredField.get(sourceObj);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            log.warn("No such field for {}", fieldName);
        }

        valueRowBuilder.addColumns(StringUtils.isBlank(columnValue)
                ? CommonConstants.NULL_VALUE
                : columnValue);
    }
}
