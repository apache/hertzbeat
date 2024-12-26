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

package org.apache.hertzbeat.collector.collect.script;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ScriptProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

/**
 * Script protocol collection implementation
 */
@Slf4j
public class ScriptCollectImpl extends AbstractCollect {
    private static final String CMD = "cmd";
    private static final String BASH = "bash";
    private static final String POWERSHELL = "powershell";
    private static final String CMD_C = "/c";
    private static final String BASH_C = "-c";
    private static final String POWERSHELL_C = "-Command";
    private static final String POWERSHELL_FILE = "-File";
    private static final String PARSE_TYPE_ONE_ROW = "oneRow";
    private static final String PARSE_TYPE_MULTI_ROW = "multiRow";
    private static final String PARSE_TYPE_NETCAT = "netcat";
    private static final String PARSE_TYPE_LOG = "log";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        Assert.notNull(metrics, "Script collect must has Imap params");
        ScriptProtocol scriptProtocol = metrics.getScript();
        Assert.notNull(scriptProtocol, "Script collect must has Imap params");
        Assert.notNull(scriptProtocol.getCharset(), "Script charset is required");
        Assert.notNull(scriptProtocol.getParseType(), "Script parse type is required");
        Assert.notNull(scriptProtocol.getScriptTool(), "Script tool is required");
        if (!(StringUtils.hasText(scriptProtocol.getScriptCommand()) || StringUtils.hasText(scriptProtocol.getScriptPath()))) {
            throw new IllegalArgumentException("At least one script command or script path is required.");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        ScriptProtocol scriptProtocol = metrics.getScript();
        long startTime = System.currentTimeMillis();
        ProcessBuilder processBuilder;
        // use command
        if (StringUtils.hasText(scriptProtocol.getScriptCommand())) {
            switch (scriptProtocol.getScriptTool()) {
                case BASH -> processBuilder = new ProcessBuilder(BASH, BASH_C, scriptProtocol.getScriptCommand().trim());
                case CMD -> processBuilder = new ProcessBuilder(CMD, CMD_C, scriptProtocol.getScriptCommand().trim());
                case POWERSHELL -> processBuilder = new ProcessBuilder("powershell.exe", POWERSHELL_C, scriptProtocol.getScriptCommand().trim());
                default -> {
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Not support script tool:" + scriptProtocol.getScriptTool());
                    return;
                }
            }
        // use command file
        } else if (StringUtils.hasText((scriptProtocol.getScriptPath()))) {
            switch (scriptProtocol.getScriptTool()) {
                case BASH -> processBuilder = new ProcessBuilder(BASH, scriptProtocol.getScriptPath().trim());
                case CMD -> processBuilder = new ProcessBuilder(CMD,  scriptProtocol.getScriptPath().trim());
                case POWERSHELL -> processBuilder = new ProcessBuilder(POWERSHELL, POWERSHELL_FILE, scriptProtocol.getScriptPath().trim());
                default -> {
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Not support script tool:" + scriptProtocol.getScriptTool());
                    return;
                }
            }
        } else {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("At least one script command or script path is required.");
            return;
        }
        // set work directory
        String workDirectory = scriptProtocol.getWorkDirectory();
        if (StringUtils.hasText(workDirectory)) {
            processBuilder.directory(new File(workDirectory));
        }
        // execute command
        try {
            Process process = processBuilder.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), Charset.forName(scriptProtocol.getCharset())));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (StringUtils.hasText(line)) {
                    response.append(line).append("\n");
                }
            }
            process.waitFor();
            Long responseTime = System.currentTimeMillis() - startTime;
            String result = String.valueOf(response);
            if (!StringUtils.hasText(result)) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("Script response data is null");
                return;
            }
            switch (scriptProtocol.getParseType()) {
                case PARSE_TYPE_LOG -> parseResponseDataByLog(result, metrics.getAliasFields(), builder, responseTime);
                case PARSE_TYPE_NETCAT -> parseResponseDataByNetcat(result, metrics.getAliasFields(), builder, responseTime);
                case PARSE_TYPE_ONE_ROW -> parseResponseDataByOne(result, metrics.getAliasFields(), builder, responseTime);
                case PARSE_TYPE_MULTI_ROW -> parseResponseDataByMulti(result, metrics.getAliasFields(), builder, responseTime);
                default -> {
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Script collect not support this parse type: " + scriptProtocol.getParseType());
                }
            }
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.warn(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Peer io failed: " + errorMsg);
        } catch (InterruptedException interruptedException){
            String errorMsg = CommonUtil.getMessageFromThrowable(interruptedException);
            log.warn(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Peer interrupt this script: " + errorMsg);
        } catch (Exception exception) {
            String errorMsg = CommonUtil.getMessageFromThrowable(exception);
            log.warn(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SCRIPT;
    }

    private void parseResponseDataByLog(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("Response data not enough: {}", result);
            return;
        }
        for (String line : lines) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(responseTime.toString());
                } else {
                    valueRowBuilder.addColumn(line);
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }

    private void parseResponseDataByNetcat(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("ssh response data not enough: {}", result);
            return;
        }
        boolean contains = lines[0].contains("=");
        Map<String, String> mapValue = Arrays.stream(lines)
                .map(item -> {
                    if (contains) {
                        return item.split("=");
                    } else {
                        return item.split("\t");
                    }
                })
                .filter(item -> item.length == 2)
                .collect(Collectors.toMap(x -> x[0], x -> x[1]));

        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String field : aliasFields) {
            String fieldValue = mapValue.get(field);
            valueRowBuilder.addColumn(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    private void parseResponseDataByOne(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("ssh response data not enough: {}", result);
            return;
        }
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        int aliasIndex = 0;
        int lineIndex = 0;
        while (aliasIndex < aliasFields.size()) {
            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(aliasFields.get(aliasIndex))) {
                valueRowBuilder.addColumn(responseTime.toString());
            } else {
                if (lineIndex < lines.length) {
                    valueRowBuilder.addColumn(lines[lineIndex].trim());
                } else {
                    valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                }
                lineIndex++;
            }
            aliasIndex++;
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    private void parseResponseDataByMulti(String result, List<String> aliasFields,
                                          CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length <= 1) {
            log.error("ssh response data only has header: {}", result);
            return;
        }
        String[] fields = lines[0].split("\\s+");
        Map<String, Integer> fieldMapping = new HashMap<>(fields.length);
        for (int i = 0; i < fields.length; i++) {
            fieldMapping.put(fields[i].trim().toLowerCase(), i);
        }
        for (int i = 1; i < lines.length; i++) {
            String[] values = lines[i].split("\\s+");
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(responseTime.toString());
                } else {
                    Integer index = fieldMapping.get(alias.toLowerCase());
                    if (index != null && index < values.length) {
                        valueRowBuilder.addColumn(values[index]);
                    } else {
                        valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                    }
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }
}
