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

package org.apache.hertzbeat.grafana.service;

import static org.apache.hertzbeat.grafana.common.GrafanaConstants.ACCOUNT_NAME;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.ACCOUNT_ROLE;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.CREATE_SERVICE_ACCOUNT_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.CREATE_SERVICE_TOKEN_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.GET_SERVICE_ACCOUNTS_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.GRAFANA_CONFIG;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.PostConstruct;
import java.util.Base64;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.GrafanaConfigDao;
import org.apache.hertzbeat.grafana.dto.GrafanaConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.support.BasicAuthenticationInterceptor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Service for managing Grafana service accounts and tokens.
 */
@Service
@Slf4j
public class ServiceAccountService {

    private final GrafanaProperties grafanaProperties;
    private final GrafanaConfigDao grafanaConfigDao;
    private final RestTemplate restTemplate;

    private String url;
    private String username;
    private String password;
    private String prefix;

    @Autowired
    public ServiceAccountService(
            GrafanaProperties grafanaProperties,
            GrafanaConfigDao grafanaConfigDao,
            RestTemplate restTemplate
    ) {
        this.grafanaProperties = grafanaProperties;
        this.grafanaConfigDao = grafanaConfigDao;
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        this.url = grafanaProperties.getUrl();
        this.username = grafanaProperties.username();
        this.password = grafanaProperties.password();
        this.prefix = grafanaProperties.getPrefix();
    }

    /**
     * Creates a new service admin account id.
     *
     * @return ResponseEntity containing the result of the account creation
     */
    public Long createServiceAccount() {
        JsonNode accounts = Objects.requireNonNull(JsonUtil.fromJson(getAccounts().getBody())).path("serviceAccounts");
        for (JsonNode account : accounts) {
            if (account.get("name").asText().equals(ACCOUNT_NAME)) {
                return account.get("id").asLong();
            }
        }
        String endpoint = String.format(prefix + CREATE_SERVICE_ACCOUNT_API, url);
        HttpHeaders headers = createHeaders();
        String body = String.format("{\"name\":\"%s\",\"role\":\"%s\",\"isDisabled\":false}", ACCOUNT_NAME, ACCOUNT_ROLE);
        restTemplate.getInterceptors().add(new BasicAuthenticationInterceptor(username, password));
        HttpEntity<String> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode jsonNode = JsonUtil.fromJson(response.getBody());
                if (jsonNode != null && jsonNode.has("id")) {
                    return jsonNode.get("id").asLong();
                }
            }
        } catch (Exception e) {
            log.error("Service account creation failed", e);
            throw new RuntimeException("Service account creation failed");
        }
        return null;
    }

    /**
     * Creates a new API token for a service account.
     *
     */
    public String applyForToken() {
        Long accountId = createServiceAccount();
        if (accountId == null) {
            log.error("Service account not found");
            throw new RuntimeException("Service account not found");
        }
        String endpoint = String.format(prefix + CREATE_SERVICE_TOKEN_API, url, accountId);
        HttpHeaders headers = createHeaders();
        String body = String.format("{\"name\":\"%s\"}", CommonUtil.generateRandomWord(6));
        restTemplate.getInterceptors().add(new BasicAuthenticationInterceptor(username, password));
        HttpEntity<String> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode jsonNode = JsonUtil.fromJson(response.getBody());
                if (jsonNode != null && jsonNode.has("key")) {
                    String token = jsonNode.get("key").asText();
                    GrafanaConfig grafanaConfig = GrafanaConfig.builder().token(token).build();
                    GeneralConfig generalConfig = GeneralConfig.builder().type(GRAFANA_CONFIG)
                            .content(JsonUtil.toJson(grafanaConfig)).build();
                    grafanaConfigDao.save(generalConfig);
                    return token;
                }
                log.info("Create token success: {}", response.getBody());
            }
        } catch (Exception e) {
            log.error("Create token error", e);
            throw new RuntimeException("Create token error");
        }
        return null;
    }

    /**
     * Retrieves the token for a service account.
     *
     * @return The token key
     */
    public String getToken() {
        GeneralConfig generalConfig = grafanaConfigDao.findByType(GRAFANA_CONFIG);
        if (generalConfig == null) {
            log.error("Service token not found");
            return null;
        }
        GrafanaConfig grafanaConfig = JsonUtil.fromJson(generalConfig.getContent(), GrafanaConfig.class);
        if (grafanaConfig == null) {
            log.error("Service token not found");
            return null;
        }
        return grafanaConfig.getToken();
    }

    /**
     * Retrieves all service accounts.
     *
     * @return ResponseEntity containing the list of service accounts
     */
    public ResponseEntity<String> getAccounts() {
        String endpoint = String.format(prefix + GET_SERVICE_ACCOUNTS_API, url);
        HttpHeaders headers = createHeaders();
        restTemplate.getInterceptors().add(new BasicAuthenticationInterceptor(username, password));
        HttpEntity<String> request = new HttpEntity<>(headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.GET, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Get accounts success");
            }
            return response;
        } catch (Exception e) {
            log.error("Get accounts error", e);
            throw new RuntimeException("Get accounts error");
        }
    }

    private HttpHeaders createHeaders() {
        String auth = username + SignConstants.DOUBLE_MARK + password;
        byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes());
        String authHeader = NetworkConstants.BASIC
                + SignConstants.BLANK + new String(encodedAuth);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(NetworkConstants.AUTHORIZATION, authHeader);
        return headers;
    }
}
