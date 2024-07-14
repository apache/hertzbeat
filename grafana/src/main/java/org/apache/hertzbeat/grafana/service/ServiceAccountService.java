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
import static org.apache.hertzbeat.grafana.common.CommonConstants.APPLICATION_JSON;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CONTENT_TYPE;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CREATE_SERVICE_ACCOUNT_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CREATE_SERVICE_TOKEN_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.DELETE_SERVICE_ACCOUNT_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.GET_SERVICE_ACCOUNTS_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.GET_SERVICE_TOKENS_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.HERTZBEAT_TOKEN;
import static org.apache.hertzbeat.grafana.common.CommonConstants.IS_DISABLED;
import static org.apache.hertzbeat.grafana.common.CommonConstants.NAME;
import static org.apache.hertzbeat.grafana.common.CommonConstants.ROLE;
import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.dtflys.forest.http.ForestResponse;
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
import org.springframework.stereotype.Service;


/**
 * ServiceAccount Service
 */

@Service
@Slf4j
public class ServiceAccountService {

    private final GrafanaConfiguration grafanaConfiguration;

    private final ServiceAccountDao serviceAccountDao;

    private final ServiceTokenDao serviceTokenDao;

    private String url;

    private String username;

    private String password;

    @Autowired
    public ServiceAccountService(
            GrafanaConfiguration grafanaConfiguration,
            ServiceAccountDao serviceAccountDao,
            ServiceTokenDao serviceTokenDao
    ) {
        this.grafanaConfiguration = grafanaConfiguration;
        this.serviceAccountDao = serviceAccountDao;
        this.serviceTokenDao = serviceTokenDao;
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
     * create service admin account
     */
    public ForestResponse<?> createServiceAccount() {
        String post = String.format(CREATE_SERVICE_ACCOUNT_API, username, password, url);
        ForestRequest<?> request = Forest.post(post);
        ForestResponse<?> forestResponse = request
                .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                .addBody(NAME, ACCOUNT_NAME)
                .addBody(ROLE, ACCOUNT_ROLE)
                .addBody(IS_DISABLED, false)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    ServiceAccount serviceAccount = JsonUtil.fromJson(res.getContent(), ServiceAccount.class);
                    if (serviceAccount != null) {
                        serviceAccountDao.save(serviceAccount);
                        log.info("create service account success, serviceAccount: {}", serviceAccount);
                    }
                })
                .onError((ex, req, res) -> {
                    log.error("service account already exists");
                }).executeAsResponse();
        return forestResponse;
    }

    /**
     * delete service account
     */
    public ForestResponse<?> deleteAccount(Long id) {
        String post = String.format(DELETE_SERVICE_ACCOUNT_API, username, password, url, id);
        ForestRequest<?> request = Forest.delete(post);
        ForestResponse<?> forestResponse = request
                .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete service account success");
                })
                .onError((ex, req, res) -> {
                    log.error("delete service account error", ex);
                    throw new RuntimeException("delete service account error");
                }).executeAsResponse();
        return forestResponse;
    }

    /**
     * create api token
     */
    public ForestResponse<?> createToken() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        } else {
            String post = String.format(CREATE_SERVICE_TOKEN_API, username, password, url, hertzbeat.getId());
            ForestRequest<?> request = Forest.post(post);
            ForestResponse<?> forestResponse = request
                    .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                    .addBody(NAME, HERTZBEAT_TOKEN)
                    .successWhen(((req, res) -> res.noException() && res.statusOk()))
                    .onSuccess((ex, req, res) -> {
                        ServiceToken serviceToken = JsonUtil.fromJson(res.getContent(), ServiceToken.class);
                        if (serviceToken != null) {
                            serviceTokenDao.save(serviceToken);
                        }
                        log.info("create token success, token: {}", res.getContent());
                    })
                    .onError((ex, req, res) -> {
                        log.error("create token error", ex);
                        throw new RuntimeException("create token error");
                    }).executeAsResponse();
            return forestResponse;
        }
    }

    /**
     * delete api token
     */
    public ForestResponse<?> deleteToken(Long id) {
        String post = String.format(CREATE_SERVICE_TOKEN_API, username, password, url, id);
        ForestRequest<?> request = Forest.delete(post);
        ForestResponse<?> forestResponse = request
                .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete token success");
                })
                .onError((ex, req, res) -> {
                    log.error("delete token error", ex);
                    throw new RuntimeException("delete token error");
                }).executeAsResponse();
        return forestResponse;
    }

    /**
     * get service accounts
     */
    public ForestResponse<?> getAccounts() {
        String post = String.format(GET_SERVICE_ACCOUNTS_API, username, password, url);
        ForestRequest<?> request = Forest.get(post);
        ForestResponse<?> forestResponse = request
                .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("get accounts success");
                })
                .onError((ex, req, res) -> {
                    log.error("get accounts error", ex);
                    throw new RuntimeException("get accounts error");
                }).executeAsResponse();
        return forestResponse;
    }

    /**
     * get service account tokens
     */
    public ForestResponse<?> getTokens() {
        String post = String.format(GET_SERVICE_TOKENS_API, username, password, url, getAccountId());
        ForestRequest<?> request = Forest.get(post);
        ForestResponse<?> forestResponse = request
                .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("get tokens success");
                })
                .onError((ex, req, res) -> {
                    log.error("get tokens error", ex);
                    throw new RuntimeException("get tokens error");
                }).executeAsResponse();
        return forestResponse;
    }

    /**
     * get service account token
     */
    public String getToken() {
        ServiceToken hertzbeatToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (hertzbeatToken == null) {
            log.error("service token not found");
            throw new RuntimeException("service token not found");
        }
        return hertzbeatToken.getKey();
    }

    /**
     * delete service account tokens
     */
    public void deleteToken() {
        ServiceToken hertzbeatToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (hertzbeatToken == null) {
            log.error("service token not found");
            throw new RuntimeException("service token not found");
        }
        serviceTokenDao.delete(hertzbeatToken);
    }

    /**
     * get service account id
     */
    public long getAccountId() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }
        log.info("service account: {}", hertzbeat);
        return hertzbeat.getId();
    }

    /**
     * get service account
     */
    public ServiceAccount getAccount() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }
        log.info("service account: {}", hertzbeat);
        return hertzbeat;
    }

    /**
     * delete service account
     */
    public void deleteAccount() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }
        serviceAccountDao.delete(hertzbeat);
    }

    /**
     * reload service account
     */
    public void reload() {
        List<JsonNode> idList = Objects.requireNonNull(JsonUtil.fromJson(getAccounts().getContent())).path("serviceAccounts").findValues("id");
        for (JsonNode jsonNode : idList) {
            deleteAccount(jsonNode.asLong());
        }
        serviceAccountDao.truncate();
        serviceTokenDao.truncate();
    }
}
