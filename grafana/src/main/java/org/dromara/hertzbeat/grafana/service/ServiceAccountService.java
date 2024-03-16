package org.dromara.hertzbeat.grafana.service;

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.dtflys.forest.http.ForestResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.grafana.config.GrafanaConfiguration;
import org.dromara.hertzbeat.grafana.dao.ServiceAccountDao;
import org.dromara.hertzbeat.grafana.dao.ServiceTokenDao;
import org.dromara.hertzbeat.common.entity.grafana.ServiceAccount;
import org.dromara.hertzbeat.common.entity.grafana.ServiceToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;

/**
 * ServiceAccount Service
 * @author zqr10159
 */
@Service
@Slf4j
public class ServiceAccountService {
    private static final String ACCOUNT_NAME = "hertzbeat";
    private static final String ACCOUNT_ROLE = "Admin";
    private static final String ACCOUNT_TOKEN_NAME = "hertzbeat-token";
    private static final String CREATE_SERVICE_ACCOUNT_API = "http://%s:%s@%s/api/serviceaccounts";
    private static final String GET_SERVICE_ACCOUNTS_API = "http://%s:%s@%s/api/serviceaccounts/search";
    private static final String DELETE_SERVICE_ACCOUNT_API = "http://%s:%s@%s/api/serviceaccounts/%d";
    private static final String CREATE_SERVICE_TOKEN_API = "http://%s:%s@%s/api/serviceaccounts/%d/tokens";
    private static final String GET_SERVICE_TOKENS_API = "http://%s:%s@%s/api/serviceaccounts/%d/tokens";
    private final GrafanaConfiguration grafanaConfiguration;
    private final ServiceAccountDao serviceAccountDao;
    private final ServiceTokenDao serviceTokenDao;
    private final ObjectMapper objectMapper;
    private String url;
    private String username;
    private String password;
    private String token;

    @Autowired
    public ServiceAccountService(
            GrafanaConfiguration grafanaConfiguration,
            ServiceAccountDao serviceAccountDao,
            ServiceTokenDao serviceTokenDao,
            ObjectMapper objectMapper
    ) {
        this.grafanaConfiguration = grafanaConfiguration;
        this.serviceAccountDao = serviceAccountDao;
        this.serviceTokenDao = serviceTokenDao;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        this.url = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
        this.username = grafanaConfiguration.getUsername();
        this.password = grafanaConfiguration.getPassword();
        ServiceToken serviceToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (serviceToken != null) {
            this.token = serviceToken.getKey();
        } else {
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
                .addHeader("Content-type", "application/json")
                .addBody("name", ACCOUNT_NAME)
                .addBody("role", ACCOUNT_ROLE)
                .addBody("isDisabled", false)
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
                .addHeader("Content-type", "application/json")
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete service account success");
                })
                .onError((ex, req, res) -> {
                    log.error("delete service account error", ex);
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
        }else {
            String post = String.format(CREATE_SERVICE_TOKEN_API, username, password, url, hertzbeat.getId());
            ForestRequest<?> request = Forest.post(post);
            ForestResponse<?> forestResponse = request
                    .addHeader("Content-type", "application/json")
                    .addBody("name", "hertzbeat-token")
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
                .addHeader("Content-type", "application/json")
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete token success");
                })
                .onError((ex, req, res) -> {
                    log.error("delete token error", ex);
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
                .addHeader("Content-type", "application/json")
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("get accounts success");
                })
                .onError((ex, req, res) -> {
                    log.error("get accounts error", ex);
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
                .addHeader("Content-type", "application/json")
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("get tokens success");
                })
                .onError((ex, req, res) -> {
                    log.error("get tokens error", ex);
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
    public void reload() throws JsonProcessingException {
        List<JsonNode> idList = objectMapper.readTree(getAccounts().getContent()).path("serviceAccounts").findValues("id");
        for (JsonNode jsonNode : idList) {
            deleteAccount(jsonNode.asLong());
        }
        serviceAccountDao.truncate();
        serviceTokenDao.truncate();
    }
}
