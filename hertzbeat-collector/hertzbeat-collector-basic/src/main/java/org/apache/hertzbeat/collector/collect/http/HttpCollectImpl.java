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

import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.io.StringReader;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import javax.net.ssl.SSLException;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.http.CommonHttpClient;
import org.apache.hertzbeat.collector.collect.http.promethus.AbstractPrometheusParse;
import org.apache.hertzbeat.collector.collect.http.promethus.PrometheusParseCreator;
import org.apache.hertzbeat.collector.collect.prometheus.parser.MetricFamily;
import org.apache.hertzbeat.collector.collect.prometheus.parser.OnlineParser;
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
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpStatus;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;
import org.xml.sax.InputSource;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.Collections;

/**
 * http https collect
 */
@Slf4j
public class HttpCollectImpl extends AbstractCollect {
    private final Set<Integer> defaultSuccessStatusCodes = Set.of(
            HttpStatus.SC_OK,
            HttpStatus.SC_CREATED,
            HttpStatus.SC_ACCEPTED,
            HttpStatus.SC_MULTIPLE_CHOICES,
            HttpStatus.SC_MOVED_PERMANENTLY,
            HttpStatus.SC_MOVED_TEMPORARILY);

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

            long responseTime = System.currentTimeMillis() - startTime;
            String parseType = metrics.getHttp().getParseType();
            HttpEntity entity = response.getEntity();

            try {
                if (DispatchConstants.PARSE_PROMETHEUS.equals(parseType)) {
                    if (entity != null) {
                        parseResponseByPrometheusExporter(entity.getContent(), metrics.getAliasFields(), builder);
                    }
                } else if (DispatchConstants.PARSE_HEADER.equals(parseType)) {
                    parseResponseByHeader(builder, metrics.getAliasFields(), response);
                    // Consume entity to release connection
                    EntityUtils.consumeQuietly(entity);
                } else {
                    /*
                     this could create large objects, potentially impacting JVM memory space significantly.
                     Option 1: Parse using InputStream, but this requires significant code changes;
                     Option 2: Manually trigger garbage collection, similar to how it's done in Dubbo for large inputs.
                     */
                    String resp = entity == null ? "" : EntityUtils.toString(entity, StandardCharsets.UTF_8);
                    if (!StringUtils.hasText(resp)) {
                        log.info("http response entity is empty, status: {}.", statusCode);
                    }
                    switch (parseType) {
                        case DispatchConstants.PARSE_JSON_PATH ->
                                parseResponseByJsonPath(resp, metrics.getAliasFields(), metrics.getHttp(), builder, responseTime);
                        case DispatchConstants.PARSE_PROM_QL ->
                                parseResponseByPromQl(resp, metrics.getAliasFields(), metrics.getHttp(), builder);
                        case DispatchConstants.PARSE_XML_PATH ->
                                parseResponseByXmlPath(resp, metrics, builder, responseTime);
                        case DispatchConstants.PARSE_WEBSITE ->
                                parseResponseByWebsite(resp, metrics, metrics.getHttp(), builder, responseTime, statusCode);
                        case DispatchConstants.PARSE_SITE_MAP ->
                                parseResponseBySiteMap(resp, metrics.getAliasFields(), builder);
                        case DispatchConstants.PARSE_CONFIG ->
                                parseResponseByConfig(resp, metrics.getAliasFields(), metrics.getHttp(), builder, responseTime);
                        default ->
                                parseResponseByDefault(resp, metrics.getAliasFields(), metrics.getHttp(), builder, responseTime);
                    }
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
                                        CollectRep.MetricsData.Builder builder, Long responseTime, int statusCode) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        for (String alias : metrics.getAliasFields()) {
            if (CollectorConstants.STATUS_CODE.equalsIgnoreCase(alias)) {
                valueRowBuilder.addColumn(Integer.toString(statusCode));
            } else {
                addColumnForSummary(responseTime, valueRowBuilder, keywordNum, alias);
            }
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
            // see https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            dbf.setXIncludeAware(false);
            DocumentBuilder db = dbf.newDocumentBuilder();
            Document document = db.parse(new InputSource(new StringReader(resp)));
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
                try (CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpGet)) {
                    statusCode = response.getStatusLine().getStatusCode();
                    EntityUtils.consume(response.getEntity());
                }
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

    private void parseResponseByXmlPath(String resp, Metrics metrics,
                                        CollectRep.MetricsData.Builder builder, Long responseTime) {
        HttpProtocol http = metrics.getHttp();
        List<String> aliasFields = metrics.getAliasFields();
        String xpathExpression = http.getParseScript();
        if (!StringUtils.hasText(xpathExpression)) {
            log.warn("Http collect parse type is xmlPath, but the xpath expression is empty.");
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("XPath expression is empty");
            return;
        }
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());

        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
            dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            dbf.setXIncludeAware(false);
            dbf.setExpandEntityReferences(false);

            DocumentBuilder db = dbf.newDocumentBuilder();
            Document document = db.parse(new InputSource(new StringReader(resp)));

            XPathFactory xpathFactory = XPathFactory.newInstance();
            XPath xpath = xpathFactory.newXPath();

            NodeList nodeList = (NodeList) xpath.evaluate(xpathExpression, document, XPathConstants.NODESET);

            if (nodeList == null || nodeList.getLength() == 0) {
                log.debug("XPath expression '{}' returned no nodes.", xpathExpression);
                boolean requestedSummaryFields = aliasFields.stream()
                        .anyMatch(alias -> NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)
                                || CollectorConstants.KEYWORD.equalsIgnoreCase(alias));

                if (requestedSummaryFields) {
                    CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                    for (String alias : aliasFields) {
                        if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                            valueRowBuilder.addColumn(responseTime.toString());
                        } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                            valueRowBuilder.addColumn(Integer.toString(keywordNum));
                        } else {
                            valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                        }
                    }
                    builder.addValueRow(valueRowBuilder.build());
                }
                return;
            }

            for (int i = 0; i < nodeList.getLength(); i++) {
                Node node = nodeList.item(i);
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();

                for (String alias : aliasFields) {
                    if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(responseTime.toString());
                    } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(Integer.toString(keywordNum));
                    } else {
                        try {
                            String value = (String) xpath.evaluate(alias, node, XPathConstants.STRING);
                            valueRowBuilder.addColumn(StringUtils.hasText(value) ? value : CommonConstants.NULL_VALUE);
                        } catch (XPathExpressionException e) {
                            log.warn("Failed to evaluate XPath '{}' for node [{}]: {}", alias, node.getNodeName(), e.getMessage());
                            valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
                        }
                    }
                }
                builder.addValueRow(valueRowBuilder.build());
            }

        } catch (Exception e) {
            log.warn("Failed to parse XML response with XPath '{}': {}", xpathExpression, e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Failed to parse XML response: " + e.getMessage());
        }
    }



    /**
     * Parses the response body in Properties/Config format.
     * Two modes are supported:
     * 1. single-object mode: if http.parseScript is null, aliasFields are treated as indicator names.
     * - If there is a locator in the indicator definition, use the locator as the key of the Properties.
     * - Otherwise, use aliasField (metric name) as the key for Properties.
     * Generate a single row of data.
     * 2. array mode: if http.parseScript is not empty (e.g. “users”), treat it as an array base path.
     * Treat aliasFields as the attribute name of an array element, and generate a single row of data for each array index. locator is invalid in this mode.
     *
     * @param resp Response body string
     * @param aliasFields List of metrics aliases (i.e., the list of fields in metrics.fields).
     * @param http http protocol configuration
     * @param builder The metrics data builder.
     * @param responseTime response time
     */
    private void parseResponseByConfig(String resp, List<String> aliasFields, HttpProtocol http,
                                       CollectRep.MetricsData.Builder builder, Long responseTime) {
        if (!StringUtils.hasText(resp)) {
            log.warn("Http collect parse type is config, but response body is empty.");
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Response body is empty");
            return;
        }

        Properties properties = new Properties();
        try (StringReader reader = new StringReader(resp)) {
            properties.load(reader);
        } catch (IOException e) {
            log.warn("Failed to parse config response: {}", e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Failed to parse config response: " + e.getMessage());
            return;
        }
        String arrayBasePath = http.getParseScript();
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());

        if (!StringUtils.hasText(arrayBasePath)) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(responseTime.toString());
                } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumn(Integer.toString(keywordNum));
                } else {
                    String value = properties.getProperty(alias);
                    valueRowBuilder.addColumn(value != null ? value : CommonConstants.NULL_VALUE);
                }
            }
            CollectRep.ValueRow valueRow = valueRowBuilder.build();
            if (hasMeaningfulDataInRow(valueRow, aliasFields)) {
                builder.addValueRow(valueRow);
            } else {
                log.warn("No meaningful data found in single config object response for aliasFields: {}", aliasFields);
            }
        } else {
            Pattern pattern = Pattern.compile("^" + Pattern.quote(arrayBasePath) + "\\[(\\d+)]\\.");
            Set<Integer> existingIndices = new HashSet<>();
            for (String key : properties.stringPropertyNames()) {
                Matcher matcher = pattern.matcher(key);
                if (matcher.find()) {
                    try {
                        int index = Integer.parseInt(matcher.group(1));
                        existingIndices.add(index);
                    } catch (NumberFormatException e) {
                        log.error("Could not parse index from key: {}", key);
                    }
                }
            }
            if (existingIndices.isEmpty()) {
                log.warn("Could not find any array elements for base path '{}' in config response.", arrayBasePath);
                return;
            }
            List<Integer> sortedIndices = new ArrayList<>(existingIndices);
            Collections.sort(sortedIndices);
            for (int i : sortedIndices) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : aliasFields) {
                    if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(responseTime.toString());
                    } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(Integer.toString(keywordNum));
                    } else {
                        String currentKey = arrayBasePath + "[" + i + "]." + alias;
                        String value = properties.getProperty(currentKey);
                        valueRowBuilder.addColumn(value != null ? value : CommonConstants.NULL_VALUE);
                    }
                }
                CollectRep.ValueRow valueRow = valueRowBuilder.build();
                if (hasMeaningfulDataInRow(valueRow, aliasFields)) {
                    builder.addValueRow(valueRowBuilder.build());
                }
            }
        }
    }

    private boolean hasMeaningfulDataInRow(CollectRep.ValueRow valueRow, List<String> aliasFields) {
        if (valueRow.getColumnsCount() == 0) {
            return false;
        }
        if (valueRow.getColumnsCount() != aliasFields.size()) {
            log.error("Column count ({}) mismatch with aliasFields size ({}) when checking meaningful data.",
                    valueRow.getColumnsCount(), aliasFields.size());
            return false;
        }

        boolean hasMeaningfulData = false;
        for (int i = 0; i < valueRow.getColumnsCount(); i++) {
            String columnValue = valueRow.getColumns(i);
            String alias = aliasFields.get(i);
            if (!CommonConstants.NULL_VALUE.equals(columnValue) && (!NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias) && !CollectorConstants.KEYWORD.equalsIgnoreCase(alias))) {
                hasMeaningfulData = true;
                break;
            }
            if ((NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias) || CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) && !CommonConstants.NULL_VALUE.equals(columnValue)) {
                hasMeaningfulData = true;
            }
        }
        return hasMeaningfulData;
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
            } else if (objectValue instanceof Number numberValue) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : aliasFields) {
                    if (NetworkConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(responseTime.toString());
                    } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumn(Integer.toString(keywordNum));
                    } else {
                        valueRowBuilder.addColumn(numberValue.toString());
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

    private void parseResponseByPrometheusExporter(InputStream content, List<String> aliasFields, CollectRep.MetricsData.Builder builder) throws IOException {
        Map<String, MetricFamily> metricFamilyMap = OnlineParser.parseMetrics(content);
        if (metricFamilyMap == null || metricFamilyMap.isEmpty()) {
            return;
        }
        String metrics = builder.getMetrics();
        if (metricFamilyMap.containsKey(metrics)) {
            MetricFamily metricFamily = metricFamilyMap.get(metrics);
            for (MetricFamily.Metric metric : metricFamily.getMetricList()) {
                Map<String, String> labelMap = metric.getLabels()
                        .stream()
                        .collect(Collectors.toMap(MetricFamily.Label::getName, MetricFamily.Label::getValue));
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String aliasField : aliasFields) {
                    if ("value".equals(aliasField)) {
                        valueRowBuilder.addColumn(String.valueOf(metric.getValue()));
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
                AuthScope authScope = new AuthScope(httpProtocol.getHost(), Integer.parseInt(httpProtocol.getPort()));
                provider.setCredentials(authScope, credentials);

                clientContext.setCredentialsProvider(provider);
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
        boolean enableUrlEncoding = Boolean.parseBoolean(httpProtocol.getEnableUrlEncoding());
        StringBuilder queryParams = new StringBuilder();

        if (params != null && !params.isEmpty()) {
            for (Map.Entry<String, String> param : params.entrySet()) {
                String key = param.getKey();
                String value = param.getValue();

                if (!StringUtils.hasText(key)) {
                    continue;
                }

                if (!queryParams.isEmpty()) {
                    queryParams.append("&");
                }

                if (enableUrlEncoding) {
                    key = UriUtils.encodeQueryParam(key, "UTF-8");
                }
                queryParams.append(key);

                if (StringUtils.hasText(value)) {
                    String calculatedValue = TimeExpressionUtil.calculate(value);
                    if (enableUrlEncoding) {
                        calculatedValue = UriUtils.encodeQueryParam(calculatedValue, "UTF-8");
                    }
                    queryParams.append("=").append(calculatedValue);
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
                    requestBuilder.addHeader(header.getKey(), header.getValue());
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
                    String encodedAuth = Base64Util.encode(authStr);
                    requestBuilder.addHeader(HttpHeaders.AUTHORIZATION, DispatchConstants.BASIC + SignConstants.BLANK + encodedAuth);
                }
            }
        }

        // if it has payload, would override post params
        if (StringUtils.hasLength(httpProtocol.getPayload()) && (HttpMethod.POST.matches(httpMethod) || HttpMethod.PUT.matches(httpMethod))) {
            requestBuilder.setEntity(new StringEntity(TimeExpressionUtil.calculate(httpProtocol.getPayload()), StandardCharsets.UTF_8));
        }

        // uri encode
        String uri;
        if (enableUrlEncoding) {
            // if the url contains parameters directly
            if (httpProtocol.getUrl().contains("?")) {
                String path = httpProtocol.getUrl().substring(0, httpProtocol.getUrl().indexOf("?"));
                String query = httpProtocol.getUrl().substring(httpProtocol.getUrl().indexOf("?") + 1);
                uri = UriUtils.encodePath(path, "UTF-8") + "?" + UriUtils.encodeQuery(query, "UTF-8");
            } else {
                uri = UriUtils.encodePath(httpProtocol.getUrl(), "UTF-8");
            }
        } else {
            uri = httpProtocol.getUrl();
        }

        // append query params
        if (!queryParams.isEmpty()) {
            uri += (uri.contains("?") ? "&" : "?") + queryParams;
        }

        String finalUri;
        if (IpDomainUtil.isHasSchema(httpProtocol.getHost())) {
            finalUri = httpProtocol.getHost() + ":" + httpProtocol.getPort() + uri;
        } else {
            String ipAddressType = IpDomainUtil.checkIpAddressType(httpProtocol.getHost());
            String baseUri = NetworkConstants.IPV6.equals(ipAddressType)
                    ? String.format("[%s]:%s%s", httpProtocol.getHost(), httpProtocol.getPort(), uri)
                    : String.format("%s:%s%s", httpProtocol.getHost(), httpProtocol.getPort(), uri);
            boolean ssl = Boolean.parseBoolean(httpProtocol.getSsl());
            if (ssl) {
                finalUri = NetworkConstants.HTTPS_HEADER + baseUri;
            } else {
                finalUri = NetworkConstants.HTTP_HEADER + baseUri;
            }
        }

        try {
            requestBuilder.setUri(finalUri);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid URI with illegal characters: {}. User has disabled URL encoding, not applying any encoding.", finalUri);
            throw e;
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