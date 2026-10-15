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

package org.apache.hertzbeat.ai.gateway.tool.protocol;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.IntStream;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.select.Select;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolOutput;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.DnsProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Protocol primitive tools backed by existing HertzBeat monitor configurations. */
@Service
public class AgentProtocolPrimitiveToolService {

    private static final Pattern UNSAFE_READ_QUERY = Pattern.compile(
            "\\b(for\\s+update|into\\s+(out|dump)file|sleep\\s*\\(|benchmark\\s*\\(|"
                    + "load_file\\s*\\(|get_lock\\s*\\(|release_lock\\s*\\()",
            Pattern.CASE_INSENSITIVE);
    private static final List<String> DNS_HEADER_FIELDS = List.of("responseTime", "opcode", "status", "flags",
        "questionRowCount", "answerRowCount", "authorityRowCount", "additionalRowCount");
    private static final List<String> DNS_SECTION_FIELDS = IntStream.range(0, 20)
        .mapToObj(index -> "section" + index).toList();
    private static final List<String> HTTP_RESPONSE_FIELDS = List.of("statusCode", "responseTime", "body");
    private static final List<String> HTTP_STATUS_CODES = IntStream.rangeClosed(100, 599)
        .mapToObj(String::valueOf).toList();

    private final AgentProtocolPrimitiveSupport support;

    public AgentProtocolPrimitiveToolService(AgentProtocolPrimitiveSupport support) {
        this.support = support;
    }

    @Tool(name = "dns.query", description = "Query DNS header, answer, authority, and additional sections using a HertzBeat DNS monitor configuration.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput query(
            @ToolParam(description = "Monitor id whose DNS configuration is used.") Long monitorId,
            @ToolParam(required = false, description = "DNS server override; defaults to the monitor configuration.") String server,
            @ToolParam(required = false, description = "DNS name override; defaults to the monitor configuration.") String name,
            @ToolParam(required = false, description = "Record type such as A, AAAA, CNAME, MX, NS, TXT, or SOA.") String recordType,
            @ToolParam(required = false, description = "Query class; default uses the monitor configuration.") String queryClass,
            @ToolParam(required = false, description = "Use DNS over TCP; default uses the monitor configuration.") Boolean tcp,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        return support.execute(monitorId, "dns", collector, 20, template -> {
            List<Metrics> metrics = new ArrayList<>();
            metrics.add(dnsMetric(template, "header", DNS_HEADER_FIELDS, server, name, recordType, queryClass, tcp));
            metrics.add(dnsMetric(template, "answer", DNS_SECTION_FIELDS, server, name, recordType, queryClass, tcp));
            metrics.add(dnsMetric(template, "authority", DNS_SECTION_FIELDS, server, name,
                    recordType, queryClass, tcp));
            metrics.add(dnsMetric(template, "additional", DNS_SECTION_FIELDS, server, name,
                    recordType, queryClass, tcp));
            return metrics;
        });
    }

    @Tool(name = "http.get", description = "Execute one bounded HTTP GET using an existing HertzBeat HTTP monitor connection.")
    @AgentToolPolicy(
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput get(
            @ToolParam(description = "Monitor id whose HTTP configuration and authorization are used.") Long monitorId,
            @ToolParam(required = false, description = "Request path override; defaults to the monitor path.") String path,
            @ToolParam(required = false, description = "Additional request headers.") Map<String, String> headers,
            @ToolParam(required = false, description = "Additional query parameters.") Map<String, String> queryParams,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        return httpRequest(monitorId, "GET", path, headers, queryParams, null, collector);
    }

    @Tool(name = "http.request", description = "Execute one approved HTTP mutation request using an existing HertzBeat HTTP monitor connection.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput request(
            @ToolParam(description = "Monitor id whose HTTP configuration and authorization are used.") Long monitorId,
            @ToolParam(description = "HTTP method such as POST, PUT, PATCH, or DELETE.") String method,
            @ToolParam(required = false, description = "Request path override; defaults to the monitor path.") String path,
            @ToolParam(required = false, description = "Additional request headers.") Map<String, String> headers,
            @ToolParam(required = false, description = "Additional query parameters.") Map<String, String> queryParams,
            @ToolParam(required = false, description = "Request body.") String body,
            @ToolParam(description = "Operational reason shown in the approval request.") String reason,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("http.request requires reason");
        }
        return httpRequest(monitorId, method, path, headers, queryParams, body, collector);
    }

    @Tool(name = "jdbc.query", description = "Execute one bounded JDBC query using an existing HertzBeat monitor connection.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput query(
            @ToolParam(description = "Monitor id whose JDBC configuration is used.") Long monitorId,
            @ToolParam(description = "Single JDBC query.") String sql,
            @ToolParam(description = "Expected result column labels in query order.") List<String> columns,
            @ToolParam(required = false, description = "Maximum returned rows; default 100 and maximum 1000.") Integer maxRows,
            @ToolParam(description = "Operational reason shown in the approval request.") String reason,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        requireSqlAndColumns(sql, columns);
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("jdbc.query requires reason");
        }
        validateReadOnlySql(sql);
        int rowLimit = maxRows == null ? 100 : Math.max(1, Math.min(maxRows, 1000));
        return support.execute(monitorId, "jdbc", collector, rowLimit, template -> {
            Metrics metrics = support.copy(template);
            metrics.setName("agent_jdbc_query");
            metrics.setAliasFields(List.copyOf(columns));
            metrics.setFields(support.fields(columns));
            metrics.getJdbc().setQueryType("multiRow");
            metrics.getJdbc().setSql(sql);
            return List.of(metrics);
        });
    }

    @Tool(name = "jdbc.execute", description = "Execute one approved JDBC change statement using an existing HertzBeat monitor connection.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput execute(
            @ToolParam(description = "Monitor id whose JDBC configuration is used.") Long monitorId,
            @ToolParam(description = "Single JDBC change statement.") String sql,
            @ToolParam(description = "Operational reason shown in the approval request.") String reason,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        if (sql == null || sql.isBlank() || reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("jdbc.execute requires sql and reason");
        }
        return support.execute(monitorId, "jdbc", collector, 1, template -> {
            Metrics metrics = support.copy(template);
            metrics.setName("agent_jdbc_execute");
            metrics.setAliasFields(List.of("affectedRows"));
            metrics.setFields(support.fields(metrics.getAliasFields()));
            metrics.getJdbc().setQueryType("execute");
            metrics.getJdbc().setSql(sql);
            metrics.getJdbc().setReuseConnection("false");
            return List.of(metrics);
        });
    }

    @Tool(name = "ssh.inspect", description = "Execute one bounded diagnostic command using an existing HertzBeat SSH monitor connection.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput inspect(
            @ToolParam(description = "Monitor id whose SSH configuration is used.") Long monitorId,
            @ToolParam(description = "Diagnostic shell command.") String command,
            @ToolParam(required = false, description = "Maximum returned lines; default 200 and maximum 1000.") Integer maxLines,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        return executeCommand(monitorId, command, maxLines, collector);
    }

    @Tool(name = "ssh.execute", description = "Execute one approved remote change command using an existing HertzBeat SSH monitor connection.")
    @AgentToolPolicy(risk = AgentToolRisk.DANGEROUS,
        exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public AgentToolOutput execute(
            @ToolParam(description = "Monitor id whose SSH configuration is used.") Long monitorId,
            @ToolParam(description = "Remote change command.") String command,
            @ToolParam(description = "Operational reason shown in the approval request.") String reason,
            @ToolParam(required = false, description = "Maximum returned lines; default 200 and maximum 1000.") Integer maxLines,
            @ToolParam(required = false, description = "Collector override; defaults to the monitor binding.") String collector) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("ssh.execute requires reason");
        }
        return executeCommand(monitorId, command, maxLines, collector);
    }

    private Metrics dnsMetric(Metrics template, String name, List<String> fields, String server, String address,
                              String recordType, String queryClass, Boolean tcp) {
        Metrics metrics = support.copy(template);
        metrics.setName(name);
        metrics.setAliasFields(fields);
        metrics.setFields(support.fields(fields));
        DnsProtocol dns = metrics.getDns();
        if (server != null && !server.isBlank()) {
            dns.setDnsServerIP(server);
        }
        if (address != null && !address.isBlank()) {
            dns.setAddress(address);
        }
        if (recordType != null && !recordType.isBlank()) {
            dns.setRecordType(recordType);
        }
        if (queryClass != null && !queryClass.isBlank()) {
            dns.setQueryClass(queryClass);
        }
        if (tcp != null) {
            dns.setTcp(tcp.toString());
        }
        return metrics;
    }

    private AgentToolOutput httpRequest(Long monitorId, String method, String path, Map<String, String> headers,
                                        Map<String, String> queryParams, String body, String collector) {
        if (method == null || method.isBlank()) {
            throw new IllegalArgumentException("HTTP method is required");
        }
        return support.execute(monitorId, "http", collector, 1, template -> {
            Metrics metrics = support.copy(template);
            metrics.setName("agent_http_request");
            metrics.setAliasFields(HTTP_RESPONSE_FIELDS);
            metrics.setFields(support.fields(HTTP_RESPONSE_FIELDS));
            HttpProtocol http = metrics.getHttp();
            http.setMethod(method.toUpperCase(Locale.ROOT));
            if (path != null && !path.isBlank()) {
                http.setUrl(path.startsWith("/") ? path : "/" + path);
            }
            if (headers != null && !headers.isEmpty()) {
                Map<String, String> merged = new LinkedHashMap<>();
                if (http.getHeaders() != null) {
                    merged.putAll(http.getHeaders());
                }
                merged.putAll(headers);
                http.setHeaders(merged);
            }
            if (queryParams != null && !queryParams.isEmpty()) {
                Map<String, String> merged = new LinkedHashMap<>();
                if (http.getParams() != null) {
                    merged.putAll(http.getParams());
                }
                merged.putAll(queryParams);
                http.setParams(merged);
            }
            http.setPayload(body);
            http.setParseType("agent_raw");
            http.setSuccessCodes(HTTP_STATUS_CODES);
            return List.of(metrics);
        });
    }

    private AgentToolOutput executeCommand(Long monitorId, String command, Integer maxLines, String collector) {
        if (command == null || command.isBlank()) {
            throw new IllegalArgumentException("SSH command is required");
        }
        int lineLimit = maxLines == null ? 200 : Math.max(1, Math.min(maxLines, 1000));
        return support.execute(monitorId, "ssh", collector, lineLimit, template -> {
            Metrics metrics = support.copy(template);
            metrics.setName("agent_ssh_command");
            metrics.setAliasFields(List.of("output"));
            metrics.setFields(support.fields(metrics.getAliasFields()));
            metrics.getSsh().setScript(command);
            metrics.getSsh().setParseType("log");
            return List.of(metrics);
        });
    }

    private void requireSqlAndColumns(String sql, List<String> columns) {
        if (sql == null || sql.isBlank() || columns == null || columns.isEmpty()) {
            throw new IllegalArgumentException("jdbc.query requires sql and columns");
        }
        if (columns.size() > 50 || columns.stream().anyMatch(column -> column == null || column.isBlank())) {
            throw new IllegalArgumentException("jdbc.query columns must contain 1 to 50 non-blank labels");
        }
    }

    private void validateReadOnlySql(String sql) {
        try {
            if (!(CCJSqlParserUtil.parse(sql) instanceof Select)
                    || UNSAFE_READ_QUERY.matcher(sql.toLowerCase(Locale.ROOT)).find()) {
                throw new IllegalArgumentException("jdbc.query accepts one side-effect-free SELECT statement only");
            }
        } catch (JSQLParserException exception) {
            throw new IllegalArgumentException("jdbc.query SQL is invalid", exception);
        }
    }
}
