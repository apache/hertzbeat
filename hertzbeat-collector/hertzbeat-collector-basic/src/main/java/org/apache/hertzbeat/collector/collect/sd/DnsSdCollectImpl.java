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
import org.xbill.DNS.AAAARecord;
import org.xbill.DNS.ARecord;
import org.xbill.DNS.Lookup;
import org.xbill.DNS.MXRecord;
import org.xbill.DNS.NSRecord;
import org.xbill.DNS.Record;
import org.xbill.DNS.SRVRecord;
import org.xbill.DNS.SimpleResolver;
import org.xbill.DNS.TextParseException;
import org.xbill.DNS.Type;

import java.time.Duration;
import java.util.Arrays;

/**
 * DNS SD collector supporting multiple record types
 */
@Slf4j
public class DnsSdCollectImpl extends AbstractCollect {

    private static final int DEFAULT_TIME_OUT = 3;

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics.getDns_sd() == null) {
            throw new IllegalArgumentException("DNS SD configuration cannot be null");
        }
        if (metrics.getDns_sd().getRecordType() == null || metrics.getDns_sd().getRecordType().isEmpty()) {
            throw new IllegalArgumentException("DNS record type cannot be null or empty");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        String hostName = metrics.getDns_sd().getHost();
        int type = Integer.parseInt(metrics.getDns_sd().getRecordType());
        Type.check(type);
        String name = metrics.getDns_sd().getRecordName();
        try {
            Lookup lookup = new Lookup(name, type);
            SimpleResolver resolver = new SimpleResolver(metrics.getDns_sd().getHost());
            resolver.setPort(Integer.parseInt(metrics.getDns_sd().getPort()));
            resolver.setTimeout(Duration.ofMillis(DEFAULT_TIME_OUT));
            lookup.setResolver(resolver);
            lookup.setCache(null);
            lookup.run();
            if (lookup.getResult() != Lookup.SUCCESSFUL) {
                handleLookupFailure(builder, name, lookup.getErrorString());
                return;
            }
            Record[] records = lookup.getAnswers();
            if (records == null || records.length == 0) {
                log.info("No record type:{} records found for host: {}", type, hostName);
                builder.setCode(CollectRep.Code.SUCCESS);
                return;
            }
            processRecords(builder, records, type);
        } catch (TextParseException e) {
            handleParseError(builder, name, e);
        } catch (Exception e) {
            handleUnexpectedError(builder, name, e);
        }
    }

    private void processRecords(CollectRep.MetricsData.Builder builder, Record[] records, int recordType) {
        switch (recordType) {
            case Type.A:
                processARecords(builder, records);
                break;
            case Type.AAAA:
                processAAAARecords(builder, records);
                break;
            case Type.SRV:
                processSrvRecords(builder, records);
                break;
            case Type.MX:
                processMxRecords(builder, records);
                break;
            case Type.NS:
                processNsRecords(builder, records);
                break;
            default:
                throw new IllegalStateException("Invalid record type: " + recordType);
        }
    }

    @SuppressWarnings({"checkstyle:AbbreviationAsWordInName", "checkstyle:LambdaParameterName"})
    private void processARecords(CollectRep.MetricsData.Builder builder, Record[] records) {
        Arrays.stream(records).filter(ARecord.class::isInstance).map(ARecord.class::cast).forEach(aRecord -> {
            CollectRep.ValueRow.Builder row = CollectRep.ValueRow.newBuilder();
            row.addColumn(aRecord.getAddress().getHostAddress());
            row.addColumn("");
            builder.addValueRow(row.build());
        });
    }

    @SuppressWarnings("checkstyle:AbbreviationAsWordInName")
    private void processAAAARecords(CollectRep.MetricsData.Builder builder, Record[] records) {
        Arrays.stream(records).filter(AAAARecord.class::isInstance).map(AAAARecord.class::cast).forEach(aaaaRecord -> {
            CollectRep.ValueRow.Builder row = CollectRep.ValueRow.newBuilder();
            row.addColumn(aaaaRecord.getAddress().getHostAddress());
            row.addColumn("");
            builder.addValueRow(row.build());
        });
    }

    private void processSrvRecords(CollectRep.MetricsData.Builder builder, Record[] records) {
        Arrays.stream(records).filter(SRVRecord.class::isInstance).map(SRVRecord.class::cast).forEach(srvRecord -> {
            CollectRep.ValueRow.Builder row = CollectRep.ValueRow.newBuilder();
            row.addColumn(srvRecord.getTarget().toString(true));
            row.addColumn(String.valueOf(srvRecord.getPort()));
            builder.addValueRow(row.build());
        });
    }

    private void processMxRecords(CollectRep.MetricsData.Builder builder, Record[] records) {
        Arrays.stream(records).filter(MXRecord.class::isInstance).map(MXRecord.class::cast).forEach(mxRecord -> {
            CollectRep.ValueRow.Builder row = CollectRep.ValueRow.newBuilder();
            row.addColumn(mxRecord.getTarget().toString(true));
            row.addColumn("");
            builder.addValueRow(row.build());
        });
    }

    private void processNsRecords(CollectRep.MetricsData.Builder builder, Record[] records) {
        Arrays.stream(records).filter(NSRecord.class::isInstance).map(NSRecord.class::cast).forEach(nsRecord -> {
            CollectRep.ValueRow.Builder row = CollectRep.ValueRow.newBuilder();
            row.addColumn(nsRecord.getTarget().toString(true));
            row.addColumn("");
            builder.addValueRow(row.build());
        });
    }

    private void handleLookupFailure(CollectRep.MetricsData.Builder builder, String host, String errorMsg) {
        String msg = String.format("DNS lookup failed for name: %s, error: %s", host, errorMsg);
        log.warn(msg);
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg(msg);
    }

    private void handleParseError(CollectRep.MetricsData.Builder builder, String host, TextParseException e) {
        String msg = String.format("DNS query parse error for name: %s, error: %s", host, e.getMessage());
        log.warn(msg, e);
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg(msg);
    }

    private void handleUnexpectedError(CollectRep.MetricsData.Builder builder, String host, Exception e) {
        String msg = String.format("Unexpected error during DNS lookup for: %s", host);
        log.error(msg, e);
        builder.setCode(CollectRep.Code.FAIL);
        builder.setMsg(msg + ": " + e.getMessage());
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_DNS_SD;
    }
}
