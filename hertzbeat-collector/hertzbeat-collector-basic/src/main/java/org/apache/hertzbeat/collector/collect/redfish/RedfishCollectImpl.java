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

package org.apache.hertzbeat.collector.collect.redfish;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.redfish.cache.RedfishConnect;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.JsonPathParser;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RedfishProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

/**
 * redfish collect impl
 */
@Slf4j
public class RedfishCollectImpl extends AbstractCollect {

    private static final char FRAGMENT_SEPARATOR = '#';

    private static final Pattern SCHEMA_PLACEHOLDER = Pattern.compile("\\{\\w+\\}");

    private static final String COLLECTION_MEMBER_PATH = "$.Members[*].['@odata.id']";

    private static final String EMBEDDED_MEMBER_PATH = "$[*].['@odata.id']";

    private static final String MODERN_FAN_SPEED_PATH = "$.SpeedPercent.SpeedRPM";

    private static final String LEGACY_FAN_SPEED_PATH = "$.Reading";

    private final GlobalConnectionCache connectionCommonCache = GlobalConnectionCache.getInstance();

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getRedfish() == null) {
            throw new IllegalArgumentException("Redfish collect must has redfish params");
        }
        RedfishProtocol redfishProtocol = metrics.getRedfish();
        Assert.hasText(redfishProtocol.getHost(), "Redfish Protocol host is required.");
        Assert.hasText(redfishProtocol.getPort(), "Redfish Protocol port is required.");
        Assert.hasText(redfishProtocol.getUsername(), "Redfish Protocol username is required.");
        Assert.hasText(redfishProtocol.getPassword(), "Redfish Protocol password is required.");
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        ConnectSession connectSession = null;
        try {
            connectSession = getRedfishConnectSession(metrics.getRedfish());
        } catch (Exception e) {
            log.error("Redfish session create error: {}", e.getMessage());
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        ResourceResolver resolver = new ResourceResolver(connectSession);
        List<String> resourcesUri = getResourcesUri(metrics, resolver);
        if (resourcesUri.isEmpty()) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(resolver.lastError != null ? resolver.lastError : "Get redfish resources uri error");
            return;
        }
        for (String uri : resourcesUri) {
            String resp;
            try {
                resp = resolver.resolve(uri);
            } catch (Exception e) {
                log.error("Get redfish {} detail resource error: {}", uri, e.getMessage());
                continue;
            }
            parseRedfishResource(builder, resp, metrics);
        }
    }

    private ConnectSession getRedfishConnectSession(RedfishProtocol redfishProtocol) throws Exception {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(redfishProtocol.getHost())
                .port(redfishProtocol.getPort())
                .password(redfishProtocol.getPassword())
                .username(redfishProtocol.getUsername())
                .build();
        ConnectSession redfishConnectSession = null;
        Optional<AbstractConnection<?>> cacheOption = connectionCommonCache.getCache(identifier, true);
        if (cacheOption.isPresent()) {
            RedfishConnect redfishConnect = (RedfishConnect) cacheOption.get();
            redfishConnectSession = redfishConnect.getConnection();
            if (redfishConnectSession == null || !redfishConnectSession.isOpen()) {
                redfishConnectSession = null;
                connectionCommonCache.removeCache(identifier);
            }
        }
        if (redfishConnectSession != null) {
            return redfishConnectSession;
        }
        RedfishClient redfishClient = RedfishClient.create(redfishProtocol);
        redfishConnectSession = redfishClient.connect();
        connectionCommonCache.addCache(identifier, new RedfishConnect(redfishConnectSession));
        return redfishConnectSession;
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_REDFISH;
    }


    private List<String> getResourcesUri(Metrics metrics, ResourceResolver resolver) {
        List<String> schemas = collectionSchemas(metrics);
        Map<String, List<String>> resourcesByParent = new LinkedHashMap<>();
        for (String schema : schemas) {
            Map<String, List<String>> candidateResources = resolveCollectionSchema(schema, resolver);
            if (!SCHEMA_PLACEHOLDER.matcher(schema).find()) {
                List<String> resources = candidateResources.get(schema);
                if (!resources.isEmpty()) {
                    return resources;
                }
                continue;
            }
            candidateResources.forEach((parent, resources) -> {
                if (!resources.isEmpty()) {
                    resourcesByParent.putIfAbsent(parent, resources);
                }
            });
        }
        List<String> resources = resourcesByParent.values().stream().flatMap(List::stream).toList();
        if (!resources.isEmpty()) {
            return resources;
        }
        log.warn("Redfish {} metrics unavailable, none of the collection schemas {} returned resources",
                metrics.getName(), schemas);
        return Collections.emptyList();
    }

    /**
     * Configured schema first, then the built-in candidates, so a user override keeps its fallbacks.
     */
    private List<String> collectionSchemas(Metrics metrics) {
        String configured = metrics.getRedfish().getSchema();
        return Stream.concat(
                        StringUtils.hasText(configured) ? Stream.of(configured) : Stream.empty(),
                        RedfishCollectionSchema.getSchemas(metrics.getName()).stream())
                .distinct()
                .toList();
    }

    private Map<String, List<String>> resolveCollectionSchema(String schema, ResourceResolver resolver) {
        String[] segments = SCHEMA_PLACEHOLDER.split(schema, -1);
        if (segments.length == 1) {
            return Map.of(schema, getCollectionResource(schema, resolver));
        }

        Map<String, List<String>> resourcesByParent = new LinkedHashMap<>();
        for (String parent : getCollectionResource(segments[0], resolver)) {
            List<String> uris = List.of(parent);
            for (int index = 1; index < segments.length; index++) {
                String segment = segments[index];
                uris = uris.stream()
                        .map(uri -> uri + segment)
                        .flatMap(uri -> getCollectionResource(uri, resolver).stream())
                        .toList();
            }
            resourcesByParent.put(parent, uris);
        }
        return resourcesByParent;
    }

    private List<String> parseCollectionResource(String resp) {
        if (!StringUtils.hasText(resp)) {
            return Collections.emptyList();
        }
        String resourceIdPath = Boolean.TRUE.equals(JsonUtil.isArray(resp)) ? EMBEDDED_MEMBER_PATH : COLLECTION_MEMBER_PATH;
        List<Object> resourceIds = JsonPathParser.parseContentWithJsonPath(resp, resourceIdPath);
        return resourceIds.stream().filter(Objects::nonNull).map(String::valueOf).toList();
    }

    private List<String> getCollectionResource(String uri, ResourceResolver resolver) {
        try {
            return parseCollectionResource(resolver.resolve(uri));
        } catch (Exception e) {
            // a candidate schema missing on this firmware is expected, so keep the reason for the failure report
            log.debug("Redfish collection {} unavailable: {}", uri, e.getMessage());
            resolver.lastError = "Get redfish " + uri + " error: " + e.getMessage();
            return Collections.emptyList();
        }
    }

    private static final class ResourceResolver {

        private final ConnectSession connectSession;
        private final Map<String, String> documentCache = new HashMap<>();

        private String lastError;

        private ResourceResolver(ConnectSession connectSession) {
            this.connectSession = connectSession;
        }

        private String resolve(String uri) throws Exception {
            int fragmentIndex = uri.indexOf(FRAGMENT_SEPARATOR);
            String documentUri = fragmentIndex < 0 ? uri : uri.substring(0, fragmentIndex);
            String document = documentCache.get(documentUri);
            if (document == null) {
                document = connectSession.getRedfishResource(documentUri);
                documentCache.put(documentUri, document);
            }
            if (fragmentIndex < 0) {
                return document;
            }
            JsonNode root = JsonUtil.fromJson(document);
            if (root == null) {
                return null;
            }
            JsonNode target = root.at(uri.substring(fragmentIndex + 1));
            return target.isMissingNode() ? null : target.toString();
        }
    }

    private void parseRedfishResource(CollectRep.MetricsData.Builder builder, String resp, Metrics metrics) {
        if (!StringUtils.hasText(resp)) {
            return;
        }
        List<String> jsonPaths = metrics.getRedfish().getJsonPath();
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String path : jsonPaths) {
            List<Object> res = parseMetricValues(resp, metrics.getName(), path);
            if (!res.isEmpty()) {
                Object value = res.get(0);
                valueRowBuilder.addColumn(value == null ? CommonConstants.NULL_VALUE : String.valueOf(value));
            } else {
                valueRowBuilder.addColumn(CommonConstants.NULL_VALUE);
            }
        }
        builder.addValueRow(valueRowBuilder.build());
    }

    private List<Object> parseMetricValues(String resp, String metricsName, String path) {
        List<Object> values = JsonPathParser.parseContentWithOptionalJsonPath(resp, path);
        if (!"Fan".equals(metricsName)
                || !MODERN_FAN_SPEED_PATH.equals(path)
                || (!values.isEmpty() && values.get(0) != null)) {
            return values;
        }
        return JsonPathParser.parseContentWithOptionalJsonPath(resp, LEGACY_FAN_SPEED_PATH);
    }
}
