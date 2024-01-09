package org.dromara.hertzbeat.collector.collect.nebulagraph;

import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.NebulaGraphProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.IpDomainUtil;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


/**
 * @author dongfeng
 */
@Slf4j
public class NebulaGraphCollectImpl extends AbstractCollect {
    private final static int SUCCESS_CODE = 200;

    private final static String[] TIME_RANGE = new String[]{"5", "60", "600", "3600"};

    private final static String REGEX = "\\.%s\\=";

    private final static String STR_SPLIT = "\n";

    private final static String STORAGE_SPLIT_KEY_VALUE = "=";

    private final static String GRAPH_API = "/stats";

    private final static String STORAGE_API = "/rocksdb_stats";


    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        if (metrics == null || metrics.getNebulaGraph() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("NebulaGraph collect must has NebulaGraph params");
            return;
        }
        NebulaGraphProtocol nebulaGraph = metrics.getNebulaGraph();
        String timePeriod = nebulaGraph.getTimePeriod();

        if (!Objects.isNull(nebulaGraph.getTimePeriod())&&!Arrays.asList(TIME_RANGE).contains(timePeriod)) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("The time range for metric statistics, currently supporting 5 seconds, 60 seconds, 600 seconds, and 3600 seconds.");
            return;
        }

        if (nebulaGraph.getHost() == null || nebulaGraph.getHost().isEmpty()) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("The host of NebulaGraph must be set");
            return;
        }

        String resp;
        long responseTime;
        HashMap<String, String> resultMap = new HashMap<>(64);
        CloseableHttpResponse response;
        HttpContext httpContext = createHttpContext(nebulaGraph.getHost(), nebulaGraph.getPort());
        HttpUriRequest request = createHttpRequest(nebulaGraph.getHost(), nebulaGraph.getPort(),
                nebulaGraph.getUrl(), nebulaGraph.getTimeout());
        try {
            // 发起http请求，获取响应数据
            response = CommonHttpClient.getHttpClient().execute(request, httpContext);
            int statusCode = response.getStatusLine().getStatusCode();
            if (statusCode != SUCCESS_CODE) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("StatusCode " + statusCode);
                return;
            }
            resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            responseTime = System.currentTimeMillis() - startTime;
            resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));
            // 根据API进行不同解析
            if (GRAPH_API.equals(nebulaGraph.getUrl())) {
                parseStatsResponse(resp, nebulaGraph.getTimePeriod(), resultMap);
            } else if (STORAGE_API.equals(nebulaGraph.getUrl())) {
                parseStorageResponse(resp, resultMap);
            }
            List<String> aliasFields = metrics.getAliasFields();
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String field : aliasFields) {
                String fieldValue = resultMap.get(field);
                valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
            }
            builder.addValues(valueRowBuilder.build());
        } catch (IOException e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }


    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_NEBULAGRAPH;
    }

    private HttpContext createHttpContext(String host, String port) {
        HttpHost httpHost = new HttpHost(host, Integer.parseInt(port));
        HttpClientContext httpClientContext = new HttpClientContext();
        httpClientContext.setTargetHost(httpHost);
        return httpClientContext;
    }

    private HttpUriRequest createHttpRequest(String host, String port, String url, String timeoutStr) {
        RequestBuilder requestBuilder = RequestBuilder.get();
        // uri
        String uri = CollectUtil.replaceUriSpecialChar(url);
        if (IpDomainUtil.isHasSchema(host)) {
            requestBuilder.setUri(host + ":" + port + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(host);
            String baseUri = CollectorConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s", host, port + uri)
                    : String.format("%s:%s", host, port + uri);

            requestBuilder.setUri(CollectorConstants.HTTP_HEADER + baseUri);
        }

        requestBuilder.addHeader(HttpHeaders.CONNECTION, "keep-alive");
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36");

        requestBuilder.addHeader(HttpHeaders.ACCEPT, "text/plain");

        int timeout = Integer.parseInt(timeoutStr);
        if (timeout > 0) {
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectTimeout(timeout)
                    .setSocketTimeout(timeout)
                    .setRedirectsEnabled(true)
                    .build();
            requestBuilder.setConfig(requestConfig);
        }
        return requestBuilder.build();
    }

    /**
     * 解析Stats响应通过时间间隔进行筛选
     *
     * @param responseBody 响应体
     * @param timePeriod   时间间隔
     */
    private void parseStatsResponse(String responseBody, String timePeriod, HashMap<String, String> resultMap) {
        // 设置正则匹配
        String timeRegex = String.format(REGEX, timePeriod);
        Pattern pattern = Pattern.compile(timeRegex);
        String[] strArray = responseBody.split(STR_SPLIT);
        for (String str : strArray) {
            Matcher matcher = pattern.matcher(str);
            if (matcher.find()) {
                String[] split = str.split(timeRegex);
                resultMap.put(split[0], split[1]);
            }
        }
    }


    /**
     * 解析Storage响应通过时间间隔进行筛选
     *
     * @param responseBody 响应体
     */
    private void parseStorageResponse(String responseBody, HashMap<String, String> resultMap) {
        String[] strArray = responseBody.split(STR_SPLIT);
        for (String str : strArray) {
            String[] split = str.split(STORAGE_SPLIT_KEY_VALUE);
            resultMap.put(split[0], split[1]);
        }
    }
}
