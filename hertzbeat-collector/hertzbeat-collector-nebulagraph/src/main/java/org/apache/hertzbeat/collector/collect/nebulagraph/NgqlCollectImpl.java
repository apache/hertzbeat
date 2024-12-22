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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.stream.Stream;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.NgqlProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.Builder;
import org.springframework.util.Assert;
import org.springframework.util.StopWatch;

/**
 * connect nebulaGraph and collect metrics use NGQL
 */
public class NgqlCollectImpl extends AbstractCollect {

    private static final String PARSE_TYPE_FILTER_COUNT = "filterCount";
    private static final String PARSE_TYPE_ONE_ROW = "oneRow";
    private static final String PARSE_TYPE_MULTI_ROW = "multiRow";
    private static final String PARSE_TYPE_COLUMNS = "columns";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_QUEUE = "QUEUE";

    private static final String COMMAND_SHOW_JOBS = "SHOW JOBS;";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        NgqlProtocol ngql = metrics.getNgql();
        Assert.hasText(ngql.getHost(), "NGQL protocol host is required");
        Assert.hasText(ngql.getPort(), "Port protocol host is required");
        Assert.hasText(ngql.getParseType(), "NGQL protocol parseType is required");
        Assert.hasText(ngql.getUsername(), "NGQL protocol username is required");
        Assert.hasText(ngql.getPassword(), "NGQL protocol password is required");
    }

    @Override
    public void collect(Builder builder, Metrics metrics) {
        NgqlProtocol ngql = metrics.getNgql();
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        NebulaTemplate nebulaTemplate = new NebulaTemplate();
        try {
            boolean initSuccess = nebulaTemplate.initSession(ngql);
            if (!initSuccess) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("Failed to connect Nebula Graph");
                return;
            }
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }

        stopWatch.stop();
        long responseTime = stopWatch.getTotalTimeMillis();
        try {
            switch (ngql.getParseType()) {
                case PARSE_TYPE_FILTER_COUNT -> filterCount(nebulaTemplate, ngql, metrics.getAliasFields(), builder, responseTime);
                case PARSE_TYPE_ONE_ROW -> queryOneRow(nebulaTemplate, ngql, metrics.getAliasFields(), builder, responseTime);
                case PARSE_TYPE_MULTI_ROW -> queryMultiRow(nebulaTemplate, ngql.getCommands(), metrics.getAliasFields(), builder, responseTime);
                case PARSE_TYPE_COLUMNS -> queryColumns(nebulaTemplate, ngql.getCommands(), metrics.getAliasFields(), builder, responseTime);
                default -> {
                }
            }
        } finally {
            nebulaTemplate.closeSessionAndPool();
        }
    }

    /**
     * parseType filterCount Filter the result set according to requirements and count the quantity
     * command:  field#ngql#filterName#filterValue
     *
     * @param nebulaTemplate template for execute ngql
     * @param protocol       ngql  protocol
     * @param columns        metrics aliasField
     * @param responseTime   cost time for connect to nebula graph
     */
    private void filterCount(NebulaTemplate nebulaTemplate, NgqlProtocol protocol, List<String> columns, CollectRep.MetricsData.Builder builder, Long responseTime) {
        Map<String, String> data = new HashMap<>();
        for (String command : protocol.getCommands()) {
            Map<String, String> showJobs = showJobs(nebulaTemplate, protocol.getSpaceName(), command);
            if (Objects.nonNull(showJobs)) {
                data.putAll(showJobs);
                continue;
            }

            String[] parts = command.split("#", -1);
            if (parts.length != 4) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("The command:[" + command + "] does not meet the requirements");
            }
            String fieldName = parts[0];
            String ngql = parts[1];
            String filterName = parts[2];
            String filterValue = parts[3];
            try {
                List<Map<String, Object>> maps = nebulaTemplate.executeCommand(ngql);
                Stream<Map<String, Object>> stream = maps.stream();
                if (StringUtils.isNotBlank(filterName)) {
                    stream = stream.filter(map -> Objects.equals(map.get(filterName), filterValue));
                }
                long count = stream.count();
                data.put(fieldName, Long.toString(count));
            } catch (Exception e) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("Query error:[" + ngql + "],Msg:[" + e.getMessage() + "]");
            }

        }
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String column : columns) {
            if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                valueRowBuilder.addColumn(String.valueOf(responseTime));
            } else {
                String value = data.get(column);
                value = value == null ? CommonConstants.NULL_VALUE : value;
                valueRowBuilder.addColumn(value);
            }
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    private void queryOneRow(NebulaTemplate nebulaTemplate, NgqlProtocol protocol, List<String> columns, CollectRep.MetricsData.Builder builder, Long responseTime) {
        Map<String, Object> queryResult = new HashMap<>();
        for (String command : protocol.getCommands()) {
            Map<String, String> showJobs = showJobs(nebulaTemplate, protocol.getSpaceName(), command);
            if (Objects.nonNull(showJobs)) {
                queryResult.putAll(showJobs);
                continue;
            }
            List<Map<String, Object>> maps = nebulaTemplate.executeCommand(command);
            if (!maps.isEmpty()) {
                queryResult.putAll(maps.get(0));
            }
        }
        inflateData(columns, responseTime, queryResult, builder);
    }

    private void queryMultiRow(NebulaTemplate nebulaTemplate, List<String> commands, List<String> columns, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String command = commands.get(0);
        try {
            List<Map<String, Object>> result = nebulaTemplate.executeCommand(command);
            for (Map<String, Object> row : result) {
                inflateData(columns, responseTime, row, builder);
            }
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Query error:[" + command + "],Msg:[" + e.getMessage() + "]");
        }

    }

    private void queryColumns(NebulaTemplate nebulaTemplate, List<String> commands, List<String> columns, CollectRep.MetricsData.Builder builder, Long responseTime) {
        Map<String, Object> resultMap = new HashMap<>();
        for (String command : commands) {
            try {
                List<Map<String, Object>> result = nebulaTemplate.executeCommand(command);
                if (!result.isEmpty() && result.get(0).size() < 2) {
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Parsing type columns requires the result set to contain at least two columns");
                    return;
                }
                for (Map<String, Object> map : result) {
                    List<Entry<String, Object>> data = map.entrySet().stream().limit(2).toList();
                    resultMap.put(Objects.toString(data.get(0).getValue()), data.get(1).getValue());
                }
            } catch (Exception e) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("Query error:[" + command + "],Msg:[" + e.getMessage() + "]");
            }
        }
        inflateData(columns, responseTime, resultMap, builder);
    }

    private void inflateData(List<String> columns, Long responseTime, Map<String, Object> dataFromDb, CollectRep.MetricsData.Builder builder) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String column : columns) {
            if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                valueRowBuilder.addColumn(String.valueOf(responseTime));
            } else {
                Object value = dataFromDb.get(column);
                value = value == null ? CommonConstants.NULL_VALUE : value;
                valueRowBuilder.addColumn(Objects.toString(value));
            }
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_NGQL;
    }

    private Map<String, String> showJobs(NebulaTemplate template, String protocolSpaceName, String command) {
        if (!command.equalsIgnoreCase(COMMAND_SHOW_JOBS)) {
            return null;
        }
        List<String> spaceNames = new ArrayList<>();
        Map<String, String> result = new HashMap<>();
        List<Map<String, Object>> jobs = new ArrayList<>();
        if (StringUtils.isNotBlank(protocolSpaceName)) {
            spaceNames.add(protocolSpaceName);
        } else {
            List<Map<String, Object>> spaces = template.executeCommand("SHOW SPACES;");
            if (spaces.isEmpty()) {
                return result;
            }
            List<String> allSpace = spaces.stream().map(s -> s.get("Name"))
                .filter(Objects::nonNull)
                .map(Objects::toString)
                .toList();
            spaceNames.addAll(allSpace);
        }
        for (String name : spaceNames) {
            jobs.addAll(template.executeCommand(COMMAND_SHOW_JOBS, name));
        }
        result.put("queue_jobs", String.valueOf(jobs.stream().filter(job -> Objects.equals(job.get("Status"), STATUS_QUEUE)).count()));
        result.put("running_jobs", String.valueOf(jobs.stream().filter(job -> Objects.equals(job.get("Status"), STATUS_RUNNING)).count()));
        return result;
    }
}
