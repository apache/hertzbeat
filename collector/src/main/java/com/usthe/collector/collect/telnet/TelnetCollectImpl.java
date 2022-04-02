package com.usthe.collector.collect.telnet;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.TelnetProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.telnet.TelnetClient;

import java.io.IOException;
import java.net.ConnectException;

/**
 * telnet协议采集实现
 * @author tom
 * @date 2021/12/4 12:32
 */
@Slf4j
public class TelnetCollectImpl extends AbstractCollect {

    private TelnetCollectImpl(){}

    public static TelnetCollectImpl getInstance() {
        return TelnetCollectImpl.Singleton.INSTANCE;
    }


    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        // 简单校验必有参数
        if (metrics == null || metrics.getTelnet() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Telnet collect must has telnet params");
            return;
        }

        TelnetProtocol telnet = metrics.getTelnet();
        // 超时时间默认6000毫秒
        int timeout = 6000;
        try {
            timeout = Integer.parseInt(telnet.getTimeout());
        } catch (Exception e) {
            log.warn(e.getMessage());
        }
        TelnetClient telnetClient = null;
        try {
            //指明Telnet终端类型，否则会返回来的数据中文会乱码
            telnetClient = new TelnetClient("vt200");
            telnetClient.setConnectTimeout(timeout);
            telnetClient.connect(telnet.getHost(),Integer.parseInt(telnet.getPort()));
            long responseTime = System.currentTimeMillis() - startTime;
            if (telnetClient.isConnected()) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : metrics.getAliasFields()) {
                    if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(Long.toString(responseTime));
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                }
                builder.addValues(valueRowBuilder.build());
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("对端连接失败，Timeout " + timeout + "ms");
                return;
            }
            telnetClient.disconnect();
        } catch (ConnectException connectException) {
            log.debug(connectException.getMessage());
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("对端拒绝连接：服务未启动端口监听或防火墙");
        } catch (IOException ioException) {
            log.debug(ioException.getMessage());
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("对端连接失败 " + ioException.getMessage());
        } finally {
            if (telnetClient != null) {
                try {
                    telnetClient.disconnect();
                } catch (Exception e) {
                    log.warn(e.getMessage());
                }
            }
        }
    }

    private static class Singleton {
        private static final TelnetCollectImpl INSTANCE = new TelnetCollectImpl();
    }
}
