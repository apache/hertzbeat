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

import static org.apache.hertzbeat.grafana.common.CommonConstants.ACCOUNT_NAME;
import static org.apache.hertzbeat.grafana.common.CommonConstants.ACCOUNT_ROLE;
import static org.apache.hertzbeat.grafana.common.CommonConstants.ACCOUNT_TOKEN_NAME;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CREATE_SERVICE_ACCOUNT_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CREATE_SERVICE_TOKEN_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.DELETE_SERVICE_ACCOUNT_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.GET_SERVICE_ACCOUNTS_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.GET_SERVICE_TOKENS_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.HERTZBEAT_TOKEN;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.grafana.ServiceAccount;
import org.apache.hertzbeat.common.entity.grafana.ServiceToken;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.dao.ServiceAccountDao;
import org.apache.hertzbeat.grafana.dao.ServiceTokenDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;


/**
 * Service for managing Grafana service accounts and tokens.
 */
@Service
@Slf4j
public class ServiceAccountService {

    private final GrafanaConfiguration grafanaConfiguration;
    private final ServiceAccountDao serviceAccountDao;
    private final ServiceTokenDao serviceTokenDao;
    private final RestTemplate restTemplate;

    private String url;
    private String username;
    private String password;

    @Autowired
    public ServiceAccountService(
            GrafanaConfiguration grafanaConfiguration,
            ServiceAccountDao serviceAccountDao,
            ServiceTokenDao serviceTokenDao,
            RestTemplate restTemplate
    ) {
        this.grafanaConfiguration = grafanaConfiguration;
        this.serviceAccountDao = serviceAccountDao;
        this.serviceTokenDao = serviceTokenDao;
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        this.url = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
        this.username = grafanaConfiguration.getUsername();
        this.password = grafanaConfiguration.getPassword();
        ServiceToken serviceToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (serviceToken == null) {
            log.error("Service token {} not found", ACCOUNT_TOKEN_NAME);
        }
    }

    /**
     * Creates a new service admin account.
     *
     * @return ResponseEntity containing the result of the account creation
     */
    public ResponseEntity<String> createServiceAccount() {
        String endpoint = String.format(CREATE_SERVICE_ACCOUNT_API, username, password, url);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = String.format("{\"name\":\"%s\",\"role\":\"%s\",\"isDisabled\":false}", ACCOUNT_NAME, ACCOUNT_ROLE);

        HttpEntity<String> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                ServiceAccount serviceAccount = JsonUtil.fromJson(response.getBody(), ServiceAccount.class);
                if (serviceAccount != null) {
                    serviceAccountDao.save(serviceAccount);
                    log.info("Create service account success: {}", serviceAccount);
                }
            }
            return response;
        } catch (Exception e) {
            log.error("Service account creation failed", e);
            throw new RuntimeException("Service account creation failed");
        }
    }

    /**
     * Deletes a service account by ID.
     *
     * @param id ID of the service account to delete
     * @return ResponseEntity containing the result of the deletion
     */
    public ResponseEntity<String> deleteAccount(Long id) {
        String endpoint = String.format(DELETE_SERVICE_ACCOUNT_API, username, password, url, id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> request = new HttpEntity<>(headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.DELETE, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Delete service account success");
            }
            return response;
        } catch (Exception e) {
            log.error("Delete service account error", e);
            throw new RuntimeException("Delete service account error");
        }
    }

    /**
     * Creates a new API token for a service account.
     *
     * @return ResponseEntity containing the result of the token creation
     */
    public ResponseEntity<String> createToken() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("Service account not found");
            throw new RuntimeException("Service account not found");
        }
        String endpoint = String.format(CREATE_SERVICE_TOKEN_API, username, password, url, hertzbeat.getId());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = String.format("{\"name\":\"%s\"}", HERTZBEAT_TOKEN);

        HttpEntity<String> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                ServiceToken serviceToken = JsonUtil.fromJson(response.getBody(), ServiceToken.class);
                if (serviceToken != null) {
                    serviceTokenDao.save(serviceToken);
                }
                log.info("Create token success: {}", response.getBody());
            }
            return response;
        } catch (Exception e) {
            log.error("Create token error", e);
            throw new RuntimeException("Create token error");
        }
    }

    /**
     * Retrieves all service accounts.
     *
     * @return ResponseEntity containing the list of service accounts
     */
    public ResponseEntity<String> getAccounts() {
        String endpoint = String.format(GET_SERVICE_ACCOUNTS_API, username, password, url);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

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

    /**
     * Retrieves all API tokens for service accounts.
     *
     * @return ResponseEntity containing the list of tokens
     */
    public ResponseEntity<String> getTokens() {
        String endpoint = String.format(GET_SERVICE_TOKENS_API, username, password, url, getAccountId());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> request = new HttpEntity<>(headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.GET, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Get tokens success");
            }
            return response;
        } catch (Exception e) {
            log.error("Get tokens error", e);
            throw new RuntimeException("Get tokens error");
        }
    }

    /**
     * Retrieves the token for a service account.
     *
     * @return The token key
     */
    public String getToken() {
        ServiceToken hertzbeatToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (hertzbeatToken == null) {
            log.error("Service token not found");
            throw new RuntimeException("Service token not found");
        }
        return hertzbeatToken.getKey();
    }

    /**
     * Deletes a service account token.
     */
    public void deleteToken() {
        ServiceToken hertzbeatToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (hertzbeatToken == null) {
            log.error("Service token not found");
            throw new RuntimeException("Service token not found");
        }
        serviceTokenDao.delete(hertzbeatToken);
    }

    /**
     * Retrieves the ID of the service account.
     *
     * @return The ID of the service account
     */
    public long getAccountId() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("Service account not found");
            throw new RuntimeException("Service account not found");
        }
        log.info("Service account: {}", hertzbeat);
        return hertzbeat.getId();
    }

    /**
     * Retrieves the service account.
     *
     * @return The service account
     */
    public ServiceAccount getAccount() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("Service account not found");
            throw new RuntimeException("Service account not found");
        }
        log.info("Service account: {}", hertzbeat);
        return hertzbeat;
    }

    /**
     * Deletes the service account.
     */
    public void deleteAccount() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("Service account not found");
            throw new RuntimeException("Service account not found");
        }
        serviceAccountDao.delete(hertzbeat);
    }

    /**
     * Reloads the service accounts and tokens, clearing existing data.
     */
    public void reload() {
        List<JsonNode> idList = Objects.requireNonNull(JsonUtil.fromJson(getAccounts().getBody())).path("serviceAccounts").findValues("id");
        for (JsonNode jsonNode : idList) {
            deleteAccount(jsonNode.asLong());
        }
        serviceAccountDao.truncate();
        serviceTokenDao.truncate();
    }
}