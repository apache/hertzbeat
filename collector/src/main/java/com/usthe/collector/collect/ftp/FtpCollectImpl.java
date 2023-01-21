package com.usthe.collector.collect.ftp;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.FtpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.ftp.FTPClient;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

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

    private final String ANONYMOUS = "anonymous";
    private final String PASSWORD = "password";

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        FTPClient ftpClient = new FTPClient();
        FtpProtocol ftpProtocol = metrics.getFtp();
        // Set timeout
        ftpClient.setControlKeepAliveReplyTimeout(Integer.parseInt(ftpProtocol.getTimeout()));
        // Judge whether the basic information is wrong
        try {
            preCheck(metrics);
        } catch (Exception e) {
            log.info("[FtpProtocol] error: {}", CommonUtil.getMessageFromThrowable(e), e);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(e.getMessage());
            return;
        }
        // Collect data to load in CollectRep.ValueRow.Builder's object
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
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(e.getMessage());
            return;
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
            connect(ftpClient, ftpProtocol);
            login(ftpClient, ftpProtocol);
            // In here, we can do some extended operation without changing the architecture
            isActive = ftpClient.changeWorkingDirectory(ftpProtocol.getDirection());
            long endTime = System.currentTimeMillis();
            responseTime = (endTime - startTime) + "";
            ftpClient.disconnect();
        } catch (Exception e) {
            log.info("[FTPClient] error: {}", CommonUtil.getMessageFromThrowable(e), e);
            throw new IllegalArgumentException(e.getMessage());
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
            // username: not empty, password: not empty
            if(StringUtils.hasText(ftpProtocol.getUsername()) && StringUtils.hasText(ftpProtocol.getPassword())) {
                if(!ftpClient.login(ftpProtocol.getUsername(), ftpProtocol.getPassword())) {
                    throw new IllegalArgumentException("The username or password may be wrong.");
                }
                return;
            }
            // anonymous access
            if(!ftpClient.login(ANONYMOUS, PASSWORD)) {
                throw new IllegalArgumentException("The server may not allow anonymous access, we need to username and password.");
            }
        } catch (Exception e) {
            log.info("[ftp login] error: {}", CommonUtil.getMessageFromThrowable(e), e);
            throw new IllegalArgumentException(e.getMessage());
        }
    }

    /**
     * connect
     */
    private void connect(FTPClient ftpClient, FtpProtocol ftpProtocol) {
        try {
            ftpClient.connect(ftpProtocol.getHost(), Integer.parseInt(ftpProtocol.getPort()));
        } catch (Exception e) {
            log.info("[ftp connection] error: {}", CommonUtil.getMessageFromThrowable(e), e);
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
        Assert.hasText(ftpProtocol.getDirection(), "Ftp Protocol direction is required.");
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_FTP;
    }
}
