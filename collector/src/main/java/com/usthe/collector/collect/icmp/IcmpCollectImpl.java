package com.usthe.collector.collect.icmp;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.IcmpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * icmp协议采集实现 - ping
 * @author tom
 * @date 2021/12/4 12:32
 */
@Slf4j
public class IcmpCollectImpl extends AbstractCollect {

    private IcmpCollectImpl(){}

    public static IcmpCollectImpl getInstance() {
        return IcmpCollectImpl.Singleton.INSTANCE;
    }


    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        // 简单校验必有参数
        if (metrics == null || metrics.getIcmp() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("ICMP collect must has icmp params");
            return;
        }
        IcmpProtocol icmp = metrics.getIcmp();
        // 超时时间默认6000毫秒
        int timeout = 6000;
        try {
            timeout = Integer.parseInt(icmp.getTimeout());
        } catch (Exception e) {
            log.warn(e.getMessage());
        }
        try {
            // todo 需要配置java虚拟机root权限从而使用ICMP，否则是判断telnet对端7号端口是否开通
            // https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address
            boolean status = InetAddress.getByName(icmp.getHost()).isReachable(timeout);
            long responseTime = System.currentTimeMillis() - startTime;
            if (status) {
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
                builder.setCode(CollectRep.Code.UN_REACHABLE);
                builder.setMsg("对端不可达，Timeout " + timeout + "ms");
                return;
            }
        } catch (UnknownHostException unknownHostException) {
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("UnknownHost " + unknownHostException.getMessage());
            return;
        } catch (IOException ioException) {
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("IOException " + ioException.getMessage());
            return;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("IllegalArgument " + e.getMessage());
        }

    }

    private static class Singleton {
        private static final IcmpCollectImpl INSTANCE = new IcmpCollectImpl();
    }
}
