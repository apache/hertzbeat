package org.dromara.hertzbeat.service;

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;

@Service
public class ServiceAccountService {
    public String createServiceAccount() {
        ForestRequest<?> request = Forest.post("http://admin:admin@82.157.76.80:3000/api/serviceaccounts");
        ForestRequest<?> forestRequest = request
                .addHeader("Content-type", "application/json")
                .addBody("name", "hertzbeat")
                .addBody("role", "Admin")
                .addBody("isDisabled", false);
        return forestRequest.execute(HashMap.class).get("id").toString();
    }

    public String createToken() {
        ForestRequest<?> request = Forest.post("http://admin:admin@82.157.76.80:3000/api/serviceaccounts/11/tokens");
        ForestRequest<?> forestRequest = request
                .addHeader("Content-type", "application/json")
                .addBody("name", "hertzbeat-token");
        return forestRequest.execute().toString();
    }
}
