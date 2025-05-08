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

package org.apache.hertzbeat.collector.collect.sd;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.xbill.DNS.Lookup;
import org.xbill.DNS.Record;
import org.xbill.DNS.SRVRecord;
import org.xbill.DNS.SimpleResolver;
import org.xbill.DNS.TextParseException;
import org.xbill.DNS.Type;

import java.time.Duration;
import java.util.Arrays;

/**
 * http sd collector
 */
@Slf4j
public class DnsSdCollectImpl extends AbstractCollect {

    private static final int DEFAULT_TIME_OUT = 3;

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {

    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        String hostName = metrics.getDns_sd().getHost();
        try {
            Lookup lookup = new Lookup(metrics.getDns_sd().getServerName(), Type.SRV);
            SimpleResolver resolver = new SimpleResolver(metrics.getDns_sd().getHost());
            resolver.setPort(Integer.parseInt(metrics.getDns_sd().getPort()));
            resolver.setTimeout(Duration.ofMillis(DEFAULT_TIME_OUT));
            lookup.setResolver(resolver);
            lookup.setCache(null);
            lookup.setSearchPath(new String[0]);

            // 执行查询
            lookup.run();
            if (lookup.getResult() != Lookup.SUCCESSFUL) {
                handleLookupFailure(builder, hostName, lookup.getErrorString());
                return;
            }
            Record[] records = lookup.getAnswers();
            if (records == null || records.length == 0) {
                log.info("No SRV records found for hostName: {}", hostName);
                builder.setCode(CollectRep.Code.SUCCESS);
                return;
            }
            // 转换并处理结果
            processSrvRecords(builder, records);
        } catch (TextParseException e) {
            handleParseError(builder, hostName, e);
        } catch (Exception e) {
            handleUnexpectedError(builder, hostName, e);
        }
    }

    private void handleLookupFailure(CollectRep.MetricsData.Builder builder, String host, String errorMsg) {
        String msg = String.format("DNS SRV lookup failed for host: %s, error: %s", host, errorMsg);
        log.warn(msg);
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg(msg);
    }

    private void processSrvRecords(CollectRep.MetricsData.Builder builder, Record[] records) {
        Arrays.stream(records).filter(record -> record instanceof SRVRecord).map(record -> (SRVRecord) record).forEach(srvRecord -> {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            valueRowBuilder.addColumn(srvRecord.getTarget().toString(true));
            valueRowBuilder.addColumn(String.valueOf(srvRecord.getPort()));
            builder.addValueRow(valueRowBuilder.build());
        });
    }

    private void handleParseError(CollectRep.MetricsData.Builder builder, String host, TextParseException e) {
        String msg = String.format("DNS SRV query parse error for host: %s, error: %s", host, e.getMessage());
        log.warn(msg, e);
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg(msg);
    }

    private void handleUnexpectedError(CollectRep.MetricsData.Builder builder, String host, Exception e) {
        String msg = String.format("Unexpected error during DNS SRV lookup for host: %s", host);
        log.error(msg, e);
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg(msg + ": " + e.getMessage());
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_DNS_SD;
    }
}
