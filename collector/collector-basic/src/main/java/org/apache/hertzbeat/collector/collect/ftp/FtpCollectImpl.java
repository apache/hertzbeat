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

package org.apache.hertzbeat.collector.collect.ftp;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.FtpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

/**
 * ftp protocol collection implementation
 */
@Slf4j
public class FtpCollectImpl extends AbstractCollect {

    private static final String ANONYMOUS = "anonymous";
    private static final String PASSWORD = "password";

    /**
     * preCheck params
     */
    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException{
        if (metrics == null || metrics.getFtp() == null) {
            throw new IllegalArgumentException("Ftp collect must has ftp params.");
        }
        FtpProtocol ftpProtocol = metrics.getFtp();
        Assert.hasText(ftpProtocol.getHost(), "Ftp Protocol host is required.");
        Assert.hasText(ftpProtocol.getPort(), "Ftp Protocol port is required.");
        Assert.hasText(ftpProtocol.getDirection(), "Ftp Protocol direction is required.");
        Assert.hasText(ftpProtocol.getTimeout(), "Ftp Protocol timeout is required.");
    }


    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        FTPClient ftpClient = new FTPClient();
        FtpProtocol ftpProtocol = metrics.getFtp();
        // Set timeout
        ftpClient.setControlKeepAliveReplyTimeout(Integer.parseInt(ftpProtocol.getTimeout()));

        // Collect data to load in CollectRep.ValueRow.Builder's object
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        Map<String, String> valueMap;
        try {
            valueMap = collectValue(ftpClient, ftpProtocol);
            metrics.getAliasFields().forEach(it -> {
                if (valueMap.containsKey(it)) {
                    String fieldValue = valueMap.get(it);
                    valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
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
     * Please modify this, if you want to add some metrics.
     */
    private Map<String, String> collectValue(FTPClient ftpClient, FtpProtocol ftpProtocol) {
        boolean isActive;
        String responseTime;
        try {
            long startTime = System.currentTimeMillis();
            connect(ftpClient, ftpProtocol);
            login(ftpClient, ftpProtocol);
            // In here, we can do some extended operation without changing the architecture
            isActive = ftpClient.changeWorkingDirectory(ftpProtocol.getDirection());
            long endTime = System.currentTimeMillis();
            responseTime = String.valueOf(endTime - startTime);
            ftpClient.disconnect();
        } catch (Exception e) {
            log.info("[FTPClient] error: {}", CommonUtil.getMessageFromThrowable(e), e);
            throw new IllegalArgumentException(e.getMessage());
        }
        return new HashMap<>(8) {
            {
                put("isActive", Boolean.toString(isActive));
                put("responseTime", responseTime);
            }
        };
    }

    /**
     * login
     */
    private void login(FTPClient ftpClient, FtpProtocol ftpProtocol) {
        try {
            // username: not empty, password: not empty
            if (StringUtils.hasText(ftpProtocol.getUsername()) && StringUtils.hasText(ftpProtocol.getPassword())) {
                if (!ftpClient.login(ftpProtocol.getUsername(), ftpProtocol.getPassword())) {
                    throw new IllegalArgumentException("The username or password may be wrong.");
                }
                return;
            }
            // anonymous access
            if (!ftpClient.login(ANONYMOUS, PASSWORD)) {
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

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_FTP;
    }
}
