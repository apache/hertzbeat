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

package org.dromara.hertzbeat.collector.collect.icmp;

import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.IcmpProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * icmp ping collect
 * @author tom
 */
@Slf4j
public class IcmpCollectImpl extends AbstractCollect {

    public IcmpCollectImpl(){}

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
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
            // todo need root java jcm to use ICMP, else it telnet the peer server 7 port available
            // todo 需要配置java虚拟机root权限从而使用ICMP，否则是判断telnet对端7号端口是否开通
            // todo https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address
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
                builder.setMsg("Un Reachable, Timeout " + timeout + "ms");
                return;
            }
        } catch (UnknownHostException unknownHostException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(unknownHostException);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("UnknownHost " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("IOException " + errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }

    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_ICMP;
    }

}
