package org.dromara.hertzbeat.grafana.service;

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.dtflys.forest.http.ForestResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.grafana.config.GrafanaConfiguration;
import org.dromara.hertzbeat.grafana.dao.ServiceAccountDao;
import org.dromara.hertzbeat.grafana.dao.ServiceTokenDao;
import org.dromara.hertzbeat.common.entity.grafana.ServiceAccount;
import org.dromara.hertzbeat.common.entity.grafana.ServiceToken;
import org.springframework.stereotype.Service;
/**
 * ServiceAccount Service
 * @author zqr10159
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ServiceAccountService {
    private static final String ACCOUNT_NAME = "hertzbeat";
    private static final String ACCOUNT_ROLE = "Admin";
    private static final String ACCOUNT_TOKEN_NAME = "hertzbeat-token";
    private static final String CREATE_SERVICE_ACCOUNT_API = "http://%s:%s@%s/api/serviceaccounts";

    private static final String CREATE_SERVICE_TOKEN_API = "http://%s:%s@%s/api/serviceaccounts/%d/tokens";

    private final GrafanaConfiguration grafanaConfiguration;

    private final ServiceAccountDao serviceAccountDao;

    private final ServiceTokenDao serviceTokenDao;
    /**
     * create service admin account
     */
    public ForestResponse<?> createServiceAccount() {
        String url = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
        String username = grafanaConfiguration.getUsername();
        String password = grafanaConfiguration.getPassword();
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
     * create api token
     */
    public ForestResponse<?> createToken() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }else {
            String url = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
            String username = grafanaConfiguration.getUsername();
            String password = grafanaConfiguration.getPassword();
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
    public String getToken() {
        ServiceToken hertzbeatToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (hertzbeatToken == null) {
            log.error("service token not found");
            throw new RuntimeException("service token not found");
        }
        return hertzbeatToken.getKey();
    }
    public void deleteToken() {
        ServiceToken hertzbeatToken = serviceTokenDao.findByName(ACCOUNT_TOKEN_NAME);
        if (hertzbeatToken == null) {
            log.error("service token not found");
            throw new RuntimeException("service token not found");
        }
        serviceTokenDao.delete(hertzbeatToken);
    }
    public long getAccountId() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }
        log.info("service account: {}", hertzbeat);
        return hertzbeat.getId();
    }
    public ServiceAccount getAccount() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }
        log.info("service account: {}", hertzbeat);
        return hertzbeat;
    }
    public void deleteAccount() {
        ServiceAccount hertzbeat = serviceAccountDao.findByName(ACCOUNT_NAME);
        if (hertzbeat == null) {
            log.error("service account not found");
            throw new RuntimeException("service account not found");
        }
        serviceAccountDao.delete(hertzbeat);
    }


}
