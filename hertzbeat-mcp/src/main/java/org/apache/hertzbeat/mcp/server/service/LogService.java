package org.apache.hertzbeat.mcp.server.service;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.ReadContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * 日志查询服务
 */
@Service
public class LogService {

    // 日志查询API基础URL
    private static final String BASE_URL = "http://localhost:4000";

    private final RestClient restClient;

    public LogService() {
        this.restClient =
                RestClient.builder()
                        .baseUrl(BASE_URL)
                        .defaultHeader("Accept", "application/json")
                        .defaultHeader("Content-Type", "application/x-www-form-urlencoded")
                        .build();
    }

    @Tool(description = "根据用户查询条件获取日志数据")
    public String getLog(
            @ToolParam(description = """
                    查询日志 SQL 语句
                    表名：hzb_log
                    表字段：
                    字段名：severity_number，类型：int，字段说明：日志等级，取值：5(对应类型为debug日志),9(对应类型为info日志),13(对应类型为warn日志),17(对应类型为error日志)
                    字段名：timestamp ，类型：timestamp，字段说明：日志时间
                    字段名：body，类型：string，字段说明：日志内容
                    """) String querySql) {

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("sql", querySql);

        try {
            String response = restClient.post()
                    .uri("/v1/sql?db=public")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(String.class);

            // 使用JsonPath解析返回结果
            ReadContext ctx = JsonPath.parse(response);

            // 获取列定义
            List<Map<String, Object>> columnSchemas = ctx.read("$.output[0].records.schema.column_schemas");

            // 获取数据行
            List<List<Object>> rows = ctx.read("$.output[0].records.rows");

            // 获取总行数
            int totalRows = ctx.read("$.output[0].records.total_rows");

            // 构建格式化的返回结果
            StringBuilder result = new StringBuilder();
            result.append("查询结果：\n\n");

            // 查找需要的字段索引
            int timestampIndex = -1;
            int severityTextIndex = -1;
            int bodyIndex = -1;

            for (int i = 0; i < columnSchemas.size(); i++) {
                String columnName = (String) columnSchemas.get(i).get("name");
                if ("timestamp".equals(columnName)) {
                    timestampIndex = i;
                } else if ("severity_text".equals(columnName)) {
                    severityTextIndex = i;
                } else if ("body".equals(columnName)) {
                    bodyIndex = i;
                }
            }

            // 添加列名
            result.append("时间\t\t\t级别\t日志内容\n");
            result.append("----------------------------------------------------\n");

            // 添加数据行
            if (rows != null && !rows.isEmpty()) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

                for (List<Object> row : rows) {
                    // 处理时间戳
                    if (timestampIndex >= 0 && timestampIndex < row.size()) {
                        Object value = row.get(timestampIndex);
                        if (value instanceof Number) {
                            long timestamp = ((Number) value).longValue();
                            // 纳秒转换为毫秒
                            Instant instant = Instant.ofEpochMilli(timestamp / 1_000_000);
                            LocalDateTime dateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
                            result.append(formatter.format(dateTime)).append("\t");
                        } else {
                            result.append("未知时间\t");
                        }
                    } else {
                        result.append("未知时间\t");
                    }

                    // 处理日志级别
                    if (severityTextIndex >= 0 && severityTextIndex < row.size()) {
                        result.append(row.get(severityTextIndex)).append("\t");
                    } else {
                        result.append("未知\t");
                    }

                    // 处理日志内容
                    if (bodyIndex >= 0 && bodyIndex < row.size()) {
                        result.append(row.get(bodyIndex));
                    } else {
                        result.append("无内容");
                    }

                    result.append("\n");
                }

                result.append("\n共 ").append(totalRows).append(" 条记录");
            } else {
                result.append("无数据");
            }

            return result.toString();
        } catch (Exception e) {
            return "查询日志失败: " + e.getMessage();
        }
    }
}
