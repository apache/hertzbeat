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

package org.apache.hertzbeat.collector.collect.icmp;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CollectCodeConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.IcmpProtocol;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * icmp ping collect
 */
@Slf4j
public class IcmpCollectImpl extends AbstractCollect {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getIcmp() == null) {
            throw new IllegalArgumentException("ICMP collect must has icmp params");
        }
    }

    @Override
    public void collect(MetricsDataBuilder metricsDataBuilder, Metrics metrics) {
        long startTime = System.currentTimeMillis();

        IcmpProtocol icmp = metrics.getIcmp();
        // The default timeout is 6000 milliseconds
        int timeout = 6000;
        try {
            timeout = Integer.parseInt(icmp.getTimeout());
        } catch (Exception e) {
            log.warn(e.getMessage());
        }
        try {
            // todo requires Java JVM with root permissions to use ICMP, otherwise check if telnet is available on peer server's port 7
            // todo requires configuring Java JVM with root permissions to use ICMP, otherwise check if telnet is available on the peer's port 7
            // todo https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address
            boolean status = InetAddress.getByName(icmp.getHost()).isReachable(timeout);
            long responseTime = System.currentTimeMillis() - startTime;
            if (!status) {
                metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_REACHABLE, "Un Reachable, Timeout " + timeout + "ms");
                return;
            }

            for (String alias : metrics.getAliasFields()) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    metricsDataBuilder.getArrowVectorWriter().setValue(alias, Long.toString(responseTime));
                } else {
                    metricsDataBuilder.getArrowVectorWriter().setNull(alias);
                }
            }
        } catch (UnknownHostException unknownHostException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(unknownHostException);
            metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_REACHABLE, "UnknownHost " + errorMsg);

        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_REACHABLE, "IOException " + errorMsg);

        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            metricsDataBuilder.setFailedMsg(errorMsg);
        }

    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_ICMP;
    }

}
