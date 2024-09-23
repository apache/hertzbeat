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

package org.apache.hertzbeat.collector.collect.ntp;

import java.io.IOException;
import java.net.InetAddress;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.ntp.NTPUDPClient;
import org.apache.commons.net.ntp.NtpV3Packet;
import org.apache.commons.net.ntp.TimeInfo;
import org.apache.commons.net.ntp.TimeStamp;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NtpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 *  ntp collect
 */
@Slf4j
public class NtpCollectImpl extends AbstractCollect {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getNtp() == null) {
            throw new IllegalArgumentException("NTP collect must have NTP params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        NtpProtocol ntpProtocol = metrics.getNtp();
        String host = ntpProtocol.getHost();
        int timeout = CollectUtil.getTimeout(ntpProtocol.getTimeout());

        NTPUDPClient client = null;

        try {
            client = new NTPUDPClient();
            client.setDefaultTimeout(timeout);
            client.open();
            InetAddress serverAddress = InetAddress.getByName(host);
            TimeInfo timeInfo = client.getTime(serverAddress);
            long responseTime = System.currentTimeMillis() - startTime;

            timeInfo.computeDetails();

            // Obtain NTP server information
            Map<String, String> resultMap = getNtpInfo(timeInfo);
            resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));

            List<String> aliasFields = metrics.getAliasFields();
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String field : aliasFields) {
                String fieldValue = resultMap.get(field);
                valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
            }
            builder.addValues(valueRowBuilder.build());
            client.close();
        } catch (SocketException socketException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(socketException);
            log.debug(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("NTPUDPClient open is fail: " + errorMsg);
        } catch (UnknownHostException unknownHostException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(unknownHostException);
            log.debug(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("NTPServerAddress is unknownHost: " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Receive timed out: " + timeout + "ms");
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception e) {
                    log.warn(e.getMessage());
                }
            }
        }
    }

    private Map<String, String> getNtpInfo(TimeInfo timeInfo) {
        Map<String, String> valueMap = new HashMap<>(16);

        NtpV3Packet message = timeInfo.getMessage();
        TimeStamp timeStamp = message.getTransmitTimeStamp();
        Date date = timeStamp.getDate();

        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
        valueMap.put("time", Long.toString(timeStamp.getTime()));
        valueMap.put("date", simpleDateFormat.format(date));
        valueMap.put("offset", Long.toString(timeInfo.getOffset()));
        valueMap.put("delay", Long.toString(timeInfo.getDelay()));
        valueMap.put("version", Integer.toString(message.getVersion()));
        valueMap.put("mode", Integer.toString(message.getMode()));
        valueMap.put("stratum", Integer.toString(message.getStratum()));
        valueMap.put("referenceId", String.valueOf(message.getReferenceId()));
        valueMap.put("precision", Integer.toString(message.getPrecision()));
        return valueMap;
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_NTP;
    }
}