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

package org.apache.hertzbeat.collector.collect.http;

import static org.apache.hertzbeat.common.constants.SignConstants.RIGHT_DASH;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.net.ssl.SSLException;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.util.Base64;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.collect.http.promethus.AbstractPrometheusParse;
import org.apache.hertzbeat.collector.collect.http.promethus.PrometheusParseCreator;
import org.apache.hertzbeat.collector.collect.http.promethus.exporter.ExporterParser;
import org.apache.hertzbeat.collector.collect.http.promethus.exporter.MetricFamily;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.collector.util.JsonPathParser;
import org.apache.hertzbeat.collector.util.TimeExpressionUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpHost;
import org.apache.http.HttpStatus;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.AuthCache;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.auth.DigestScheme;
import org.apache.http.impl.client.BasicAuthCache;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * http https collect
 */
@Slf4j
public class HttpCollectImpl extends AbstractCollect {
    private static final Map<Long, ExporterParser> EXPORTER_PARSER_TABLE = new ConcurrentHashMap<>();
    private final Set<Integer> defaultSuccessStatusCodes = Stream.of(HttpStatus.SC_OK, HttpStatus.SC_CREATED,
            HttpStatus.SC_ACCEPTED, HttpStatus.SC_MULTIPLE_CHOICES, HttpStatus.SC_MOVED_PERMANENTLY,
            HttpStatus.SC_MOVED_TEMPORARILY).collect(Collectors.toSet());

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getHttp() == null) {
            throw new IllegalArgumentException("Http/Https collect must has http params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();

        HttpProtocol httpProtocol = metrics.getHttp();
        String url = httpProtocol.getUrl();
        if (!StringUtils.hasText(url) || !url.startsWith(RIGHT_DASH)) {
            httpProtocol.setUrl(StringUtils.hasText(url) ? RIGHT_DASH + url.trim() : RIGHT_DASH);
        }
        if (CollectionUtils.isEmpty(httpProtocol.getSuccessCodes())) {
            httpProtocol.setSuccessCodes(List.of(HttpStatus.SC_OK + ""));
        }

        HttpContext httpContext = createHttpContext(metrics.getHttp());
        HttpUriRequest request = createHttpRequest(metrics.getHttp());
        try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(request, httpContext)) {
            int statusCode = response.getStatusLine().getStatusCode();
            boolean isSuccessInvoke = checkSuccessInvoke(metrics, statusCode);
            log.debug("http response status: {}", statusCode);
            if (!isSuccessInvoke) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg(NetworkConstants.STATUS_CODE + SignConstants.BLANK + statusCode);
                return;
            }
            // todo This code converts an InputStream directly to a String. For large data in Prometheus exporters,
            // this could create large objects, potentially impacting JVM memory space significantly.
            // Option 1: Parse using InputStream, but this requires significant code changes;
            // Option 2: Manually trigger garbage collection, similar to how it's done in Dubbo for large inputs.
            String resp = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
            if (!StringUtils.hasText(resp)) {
                log.info("http response entity is empty, status: {}.", statusCode);
            }
            Long responseTime = System.currentTimeMillis() - startTime;
            String parseType = metrics.getHttp().getParseType();
            try {
                switch (parseType) {
                    case DispatchConstants.PARSE_JSON_PATH ->
                            parseResponseByJsonPath(resp, metrics.getAliasFields(), metrics.getHttp(), builder, responseTime);
                    case DispatchConstants.PARSE_PROM_QL ->
                            parseResponseByPromQl(resp, metrics.getAliasFields(), metrics.getHttp(), builder);
                    case DispatchConstants.PARSE_PROMETHEUS ->
                            parseResponseByPrometheusExporter(resp, metrics.getAliasFields(), builder);
                    case DispatchConstants.PARSE_XML_PATH ->
                            parseResponseByXmlPath(resp, metrics.getAliasFields(), metrics.getHttp(), builder);
                    case DispatchConstants.PARSE_WEBSITE ->
                            parseResponseByWebsite(resp, metrics, metrics.getHttp(), builder, responseTime, response);
                    case DispatchConstants.PARSE_SITE_MAP ->
                            parseResponseBySiteMap(resp, metrics.getAliasFields(), builder);
                    case DispatchConstants.PARSE_HEADER ->
                            parseResponseByHeader(builder, metrics.getAliasFields(), response);
                    default ->
                            parseResponseByDefault(resp, metrics.getAliasFields(), metrics.getHttp(), builder, responseTime);
                }
            } catch (Exception e) {
                log.info("parse error: {}.", e.getMessage(), e);
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("parse response data error:" + e.getMessage());
            }
        } catch (ClientProtocolException e1) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e1);
            log.error(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (UnknownHostException e2) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e2);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("unknown host:" + errorMsg);
        } catch (InterruptedIOException | ConnectException | SSLException e3) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e3);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (IOException e4) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e4);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (request != null) {
                request.abort();
            }
        }
    }

    private void parseResponseByHeader(CollectRep.MetricsData.Builder builder, List<String> aliases, CloseableHttpResponse response) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String alias : aliases) {
            if (!StringUtils.hasText(alias)) {
                valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                continue;
            }
            final Header firstHeader = response.getFirstHeader(alias);
            if (Objects.isNull(firstHeader)) {
                valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                continue;
            }

            valueRowBuilder.addColumn(firstHeader.getValue());
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_HTTP;
    }

    private void parseResponseByWebsite(String resp, Metrics metrics, HttpProtocol http,
                                        CollectRep.MetricsData.Builder builder, Long responseTime,
                                        CloseableHttpResponse response) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        for (String alias : metrics.getAliasFields()) {
            addColumnForSummary(responseTime, valueRowBuilder, keywordNum, alias);
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    private void addColumnForSummary(Long responseTime, CollectRep.ValueRow.Builder valueRowBuilder, int keywordNum, String alias) {
        if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
            valueRowBuilder.addColumn(responseTime.toString());
        } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
            valueRowBuilder.addColumn(Integer.toString(keywordNum));
        } else {
            valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
        }
    }

    private void parseResponseBySiteMap(String resp, List<String> aliasFields,
                                        CollectRep.MetricsData.Builder builder) {
        List<String> siteUrls = new LinkedList<>();
        boolean isXmlFormat = true;
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db = dbf.newDocumentBuilder();
            Document document = db.parse(new ByteArrayInputStream(resp.getBytes(StandardCharsets.UTF_8)));
            NodeList urlList = document.getElementsByTagName("url");
            for (int i = 0; i < urlList.getLength(); i++) {
                Node urlNode = urlList.item(i);
                NodeList childNodes = urlNode.getChildNodes();
                for (int k = 0; k < childNodes.getLength(); k++) {
                    Node currentNode = childNodes.item(k);
                    // distinguish between text nodes and element nodes
                    if (currentNode.getNodeType() == Node.ELEMENT_NODE && "loc".equals(currentNode.getNodeName())) {
                        // retrieves the value of the loc node
                        siteUrls.add(currentNode.getFirstChild().getNodeValue());
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn(e.getMessage());
            isXmlFormat = false;
        }
        // if XML parsing fails, parse in TXT format
        if (!isXmlFormat) {
            try {
                String[] urls = resp.split("\n");
                // validate whether the given value is a URL
                if (IpDomainUtil.isHasSchema(urls[0])) {
                    siteUrls.addAll(Arrays.asList(urls));
                }
            } catch (Exception e) {
                log.warn(e.getMessage(), e);
            }
        }
        // start looping through each site URL to collect its HTTP status code, response time, and exception information
        for (String siteUrl : siteUrls) {
            String errorMsg = "";
            Integer statusCode = null;
            long startTime = System.currentTimeMillis();
            try {
                HttpGet httpGet = new HttpGet(siteUrl);
                CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpGet);
                statusCode = response.getStatusLine().getStatusCode();
                EntityUtils.consume(response.getEntity());
            } catch (ClientProtocolException e1) {
                if (e1.getCause() != null) {
                    errorMsg = e1.getCause().getMessage();
                } else {
                    errorMsg = e1.getMessage();
                }
            } catch (UnknownHostException e2) {
                errorMsg = "unknown host";
            } catch (InterruptedIOException | ConnectException | SSLException e3) {
                errorMsg = "connect error: " + e3.getMessage();
            } catch (IOException e4) {
                errorMsg = "io error: " + e4.getMessage();
            } catch (Exception e) {
                errorMsg = "error: " + e.getMessage();
            }
            long responseTime = System.currentTimeMillis() - startTime;
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (NetworkConstants.URL.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(siteUrl);
                } else if (NetworkConstants.STATUS_CODE.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(statusCode == null
                            ? CommonConstants.NULL_VALUE : String.valueOf(statusCode));
                } else if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(String.valueOf(responseTime));
                } else if (NetworkConstants.ERROR_MSG.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(errorMsg);
                } else {
                    valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }

    private void parseResponseByXmlPath(String resp, List<String> aliasFields, HttpProtocol http,
                                        CollectRep.MetricsData.Builder builder) {
    }

    private void parseResponseByJsonPath(String resp, List<String> aliasFields, HttpProtocol http,
                                         CollectRep.MetricsData.Builder builder, Long responseTime) {
        List<Object> results = JsonPathParser.parseContentWithJsonPath(resp, http.getParseScript());
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        for (int i = 0; i < results.size(); i++) {
            Object objectValue = results.get(i);
            // if a property is missing or empty due to target version issues, filter it. Refer to the app-elasticsearch.yml configuration under name: nodes
            if (objectValue == null) {
                continue;
            }
            if (objectValue instanceof Map) {
                Map<String, Object> stringMap = (Map<String, Object>) objectValue;
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : aliasFields) {
                    Object value = stringMap.get(alias);
                    if (value != null) {
                        valueRowBuilder.addColumn(String.valueOf(value));
                    } else {
                        if (alias.startsWith("$.")) {
                            List<Object> subResults = JsonPathParser.parseContentWithJsonPath(resp, http.getParseScript() + alias.substring(1));
                            if (subResults != null && subResults.size() > i) {
                                Object resultValue = subResults.get(i);
                                valueRowBuilder.addColumn(resultValue == null ? CommonConstants.NULL_VALUE : String.valueOf(resultValue));
                            } else {
                                valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                            }
                        } else {
                            addColumnForSummary(responseTime, valueRowBuilder, keywordNum, alias);
                        }
                    }
                }
                builder.addValueRow(valueRowBuilder.build());
            } else if (objectValue instanceof String stringValue) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : aliasFields) {
                    if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(responseTime.toString());
                    } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(Integer.toString(keywordNum));
                    } else {
                        valueRowBuilder.addColumn(stringValue);
                    }
                }
                builder.addValueRow(valueRowBuilder.build());
            }
        }
    }

    private void parseResponseByPromQl(String resp, List<String> aliasFields, HttpProtocol http,
                                       CollectRep.MetricsData.Builder builder) {
        AbstractPrometheusParse prometheusParser = PrometheusParseCreator.getPrometheusParse();
        prometheusParser.handle(resp, aliasFields, http, builder);
    }

    private void parseResponseByPrometheusExporter(String resp, List<String> aliasFields,
                                                   CollectRep.MetricsData.Builder builder) {
        if (!EXPORTER_PARSER_TABLE.containsKey(builder.getId())) {
            EXPORTER_PARSER_TABLE.put(builder.getId(), new ExporterParser());
        }
        ExporterParser parser = EXPORTER_PARSER_TABLE.get(builder.getId());
        Map<String, MetricFamily> metricFamilyMap = parser.textToMetric(resp);
        String metrics = builder.getMetrics();
        if (metricFamilyMap.containsKey(metrics)) {
            MetricFamily metricFamily = metricFamilyMap.get(metrics);
            for (MetricFamily.Metric metric : metricFamily.getMetricList()) {
                Map<String, String> labelMap = metric.getLabelPair()
                        .stream()
                        .collect(Collectors.toMap(MetricFamily.Label::getName, MetricFamily.Label::getValue));
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String aliasField : aliasFields) {
                    if ("value".equals(aliasField)) {
                        if (metric.getCounter() != null) {
                            valueRowBuilder.addColumn(String.valueOf(metric.getCounter().getValue()));
                        } else if (metric.getGauge() != null) {
                            valueRowBuilder.addColumn(String.valueOf(metric.getGauge().getValue()));
                        } else if (metric.getUntyped() != null) {
                            valueRowBuilder.addColumn(String.valueOf(metric.getUntyped().getValue()));
                        } else if (metric.getInfo() != null) {
                            valueRowBuilder.addColumn(String.valueOf(metric.getInfo().getValue()));
                        } else if (metric.getSummary() != null) {
                            valueRowBuilder.addColumn(String.valueOf(metric.getSummary().getValue()));
                        } else if (metric.getHistogram() != null) {
                            valueRowBuilder.addColumn(String.valueOf(metric.getHistogram().getValue()));
                        }
                    } else {
                        String columnValue = labelMap.get(aliasField);
                        valueRowBuilder.addColumn(columnValue == null ? CommonConstants.NULL_VALUE : columnValue);
                    }
                }
                builder.addValueRow(valueRowBuilder.build());
            }
        }
    }

    private void parseResponseByDefault(String resp, List<String> aliasFields, HttpProtocol http,
                                        CollectRep.MetricsData.Builder builder, Long responseTime) {
        JsonElement element = JsonParser.parseString(resp);
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        if (element.isJsonArray()) {
            JsonArray array = element.getAsJsonArray();
            for (JsonElement jsonElement : array) {
                getValueFromJson(aliasFields, builder, responseTime, jsonElement, keywordNum);
            }
        } else {
            getValueFromJson(aliasFields, builder, responseTime, element, keywordNum);
        }
    }

    private void getValueFromJson(List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime, JsonElement element, int keywordNum) {
        if (element.isJsonObject()) {
            JsonObject object = element.getAsJsonObject();
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                JsonElement valueElement = object.get(alias);
                if (valueElement != null) {
                    String value = valueElement.getAsString();
                    valueRowBuilder.addColumn(value);
                } else {
                    addColumnForSummary(responseTime, valueRowBuilder, keywordNum, alias);
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }

    /**
     * create httpContext
     *
     * @param httpProtocol http protocol
     * @return context
     */
    public HttpContext createHttpContext(HttpProtocol httpProtocol) {
        HttpProtocol.Authorization auth = httpProtocol.getAuthorization();
        if (auth != null && DispatchConstants.DIGEST_AUTH.equals(auth.getType())) {
            HttpClientContext clientContext = new HttpClientContext();
            if (StringUtils.hasText(auth.getDigestAuthUsername())
                    && StringUtils.hasText(auth.getDigestAuthPassword())) {
                CredentialsProvider provider = new BasicCredentialsProvider();
                UsernamePasswordCredentials credentials = new UsernamePasswordCredentials(auth.getDigestAuthUsername(),
                        auth.getDigestAuthPassword());
                provider.setCredentials(AuthScope.ANY, credentials);
                AuthCache authCache = new BasicAuthCache();
                authCache.put(new HttpHost(httpProtocol.getHost(), Integer.parseInt(httpProtocol.getPort())), new DigestScheme());
                clientContext.setCredentialsProvider(provider);
                clientContext.setAuthCache(authCache);
                return clientContext;
            }
        }
        return null;
    }

    /**
     * create http request
     *
     * @param httpProtocol http params
     * @return http uri request
     */
    public HttpUriRequest createHttpRequest(HttpProtocol httpProtocol) {
        RequestBuilder requestBuilder;
        String httpMethod = httpProtocol.getMethod().toUpperCase();
        if (HttpMethod.GET.matches(httpMethod)) {
            requestBuilder = RequestBuilder.get();
        } else if (HttpMethod.POST.matches(httpMethod)) {
            requestBuilder = RequestBuilder.post();
        } else if (HttpMethod.PUT.matches(httpMethod)) {
            requestBuilder = RequestBuilder.put();
        } else if (HttpMethod.DELETE.matches(httpMethod)) {
            requestBuilder = RequestBuilder.delete();
        } else if (HttpMethod.PATCH.matches(httpMethod)) {
            requestBuilder = RequestBuilder.patch();
        } else {
            // not support the method
            log.error("not support the http method: {}.", httpProtocol.getMethod());
            return null;
        }
        // params
        Map<String, String> params = httpProtocol.getParams();
        if (params != null && !params.isEmpty()) {
            for (Map.Entry<String, String> param : params.entrySet()) {
                if (StringUtils.hasText(param.getValue())) {
                    requestBuilder.addParameter(param.getKey(), TimeExpressionUtil.calculate(param.getValue()));
                }
            }
        }
        // The default request header can be overridden if customized
        // keep-alive
        requestBuilder.addHeader(HttpHeaders.CONNECTION, NetworkConstants.KEEP_ALIVE);
        requestBuilder.addHeader(HttpHeaders.USER_AGENT, NetworkConstants.USER_AGENT);
        // headers  The custom request header is overwritten here
        Map<String, String> headers = httpProtocol.getHeaders();
        if (headers != null && !headers.isEmpty()) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                if (StringUtils.hasText(header.getValue())) {
                    requestBuilder.addHeader(CollectUtil.replaceUriSpecialChar(header.getKey()),
                            CollectUtil.replaceUriSpecialChar(header.getValue()));
                }
            }
        }
        // add accept
        if (DispatchConstants.PARSE_DEFAULT.equals(httpProtocol.getParseType())
                || DispatchConstants.PARSE_JSON_PATH.equals(httpProtocol.getParseType())) {
            requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        } else if (DispatchConstants.PARSE_XML_PATH.equals(httpProtocol.getParseType())) {
            requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_HTML_VALUE + "," + MediaType.APPLICATION_XML_VALUE);
        } else {
            requestBuilder.addHeader(HttpHeaders.ACCEPT, MediaType.ALL_VALUE);
        }

        if (httpProtocol.getAuthorization() != null) {
            HttpProtocol.Authorization authorization = httpProtocol.getAuthorization();
            if (DispatchConstants.BEARER_TOKEN.equalsIgnoreCase(authorization.getType())) {
                String value = DispatchConstants.BEARER + " " + authorization.getBearerTokenToken();
                requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, value);
            } else if (DispatchConstants.BASIC_AUTH.equals(authorization.getType())) {
                if (StringUtils.hasText(authorization.getBasicAuthUsername())
                        && StringUtils.hasText(authorization.getBasicAuthPassword())) {
                    String authStr = authorization.getBasicAuthUsername() + SignConstants.DOUBLE_MARK + authorization.getBasicAuthPassword();
                    String encodedAuth = new String(Base64.encodeBase64(authStr.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, DispatchConstants.BASIC + SignConstants.BLANK + encodedAuth);
                }
            }
        }

        // if it has payload, would override post params
        if (StringUtils.hasLength(httpProtocol.getPayload()) && (HttpMethod.POST.matches(httpMethod) || HttpMethod.PUT.matches(httpMethod))) {
            requestBuilder.setEntity(new StringEntity(httpProtocol.getPayload(), StandardCharsets.UTF_8));
        }

        // uri
        String uri = CollectUtil.replaceUriSpecialChar(httpProtocol.getUrl());
        if (IpDomainUtil.isHasSchema(httpProtocol.getHost())) {

            requestBuilder.setUri(httpProtocol.getHost() + ":" + httpProtocol.getPort() + uri);
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(httpProtocol.getHost());
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s%s", httpProtocol.getHost(), httpProtocol.getPort(), uri)
                    : String.format("%s:%s%s", httpProtocol.getHost(), httpProtocol.getPort(), uri);
            boolean ssl = Boolean.parseBoolean(httpProtocol.getSsl());
            if (ssl) {
                requestBuilder.setUri(NetworkConstants.HTTPS_HEADER + baseUri);
            } else {
                requestBuilder.setUri(NetworkConstants.HTTP_HEADER + baseUri);
            }
        }

        // custom timeout
        int timeout = CollectUtil.getTimeout(httpProtocol.getTimeout(), 0);
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

    private boolean checkSuccessInvoke(Metrics metrics, int statusCode) {
        List<String> successCodes = metrics.getHttp().getSuccessCodes();
        Set<Integer> successCodeSet = successCodes != null ? successCodes.stream().map(code -> {
            try {
                return Integer.valueOf(code);
            } catch (Exception ignored) {
                return null;
            }
        }).filter(Objects::nonNull).collect(Collectors.toSet()) : defaultSuccessStatusCodes;
        if (successCodeSet.isEmpty()) {
            successCodeSet = defaultSuccessStatusCodes;
        }
        return successCodeSet.contains(statusCode);
    }
}
