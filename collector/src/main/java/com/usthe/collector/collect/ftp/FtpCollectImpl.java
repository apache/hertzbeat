package com.usthe.collector.collect.ftp;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.FtpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.ftp.FTPClient;
import org.springframework.util.Assert;

import java.util.HashMap;
import java.util.Map;

/**
 * ftp protocol collection implementation
 * ftp协议采集实现
 *
 * @author 落阳
 * @date 2023/1/18
 */
@Slf4j
public class FtpCollectImpl extends AbstractCollect {

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        FTPClient ftpClient = new FTPClient();
        FtpProtocol ftpProtocol = metrics.getFtp();
        // Set timeout
        ftpClient.setControlKeepAliveReplyTimeout(Integer.parseInt(ftpProtocol.getTimeout()));
        // Judge whether the basic information is wrong
        try {
            preCheck(metrics);
            connect(ftpClient, ftpProtocol);
            login(ftpClient, ftpProtocol);
        } catch (Exception e) {
            log.info("[ftp connection] error: {}", e);
            try {
                ftpClient.disconnect();
            } catch (Exception ex) {
                log.info("[FtpClient] unknown error: {}", ex);
            }
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(e.getMessage());
            return;
        }
        // Collection finished, so we need to load the data in CollectRep.ValueRow.Builder's object
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        Map<String, String> valueMap;
        try {
            valueMap = collectValue(ftpClient, ftpProtocol);
            metrics.getAliasFields().forEach(it -> {
                if (valueMap.containsKey(it)) {
                    String fieldValue = valueMap.get(it);
                    if (fieldValue == null) {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    } else {
                        valueRowBuilder.addColumns(fieldValue);
                    }
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
            });
        } catch (Exception e) {
            try {
                ftpClient.disconnect();
            } catch (Exception ex) {
                log.info("[FtpClient] unknown error: {}", ex);
            }
            log.info("[FtpClient] unknown error: {}", e);
        }
        builder.addValues(valueRowBuilder.build());
    }

    /**
     * collect data: key-value
     * Please modify this, if you want to add some indicators.
     */
    private Map<String, String> collectValue(FTPClient ftpClient, FtpProtocol ftpProtocol) {
        Boolean isActive;
        String responseTime;
        try {
            long startTime = System.currentTimeMillis();
            // In here, we can do some extended operation without changing the architecture
            isActive = ftpClient.changeWorkingDirectory(ftpProtocol.getDirection());
            long endTime = System.currentTimeMillis();
            responseTime = (endTime - startTime) + "";
        } catch (Exception e) {
            throw new IllegalArgumentException("Please send the request later.");
        }
        return new HashMap<>(8) {{
            put("isActive", isActive.toString());
            put("responseTime", responseTime);
        }};
    }

    /**
     * login
     */
    private void login(FTPClient ftpClient, FtpProtocol ftpProtocol) {
        try {
            if(!ftpClient.login(ftpProtocol.getUsername(), ftpProtocol.getPassword())) {
                throw new IllegalArgumentException("The host or port may be wrong.");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Please send the request later.");
        }
    }

    /**
     * connect
     */
    private void connect(FTPClient ftpClient, FtpProtocol ftpProtocol) {
        try {
            ftpClient.connect(ftpProtocol.getHost(), Integer.parseInt(ftpProtocol.getPort()));
        } catch (Exception e) {
            throw new IllegalArgumentException("The host or port may be wrong.");
        }
    }

    /**
     * preCheck params
     */
    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getFtp() == null) {
            throw new IllegalArgumentException("Ftp collect must has ftp params.");
        }
        FtpProtocol ftpProtocol = metrics.getFtp();
        Assert.hasText(ftpProtocol.getHost(), "Ftp Protocol host is required.");
        Assert.hasText(ftpProtocol.getPort(), "Ftp Protocol port is required.");
        Assert.hasText(ftpProtocol.getPassword(), "Ftp Protocol password is required.");
        Assert.hasText(ftpProtocol.getUsername(), "Ftp Protocol username is required.");
        Assert.hasText(ftpProtocol.getDirection(), "Ftp Protocol direction is required.");
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_FTP;
    }
}
