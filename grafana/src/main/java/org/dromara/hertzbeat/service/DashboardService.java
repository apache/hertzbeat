package org.dromara.hertzbeat.service;

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class DashboardService {

    /**
     * create dashboard
     * @return dashboard info
     */
    public String createDashboard(Object dashboard) {
        ForestRequest<?> request = Forest.post("http://82.157.76.80:3000/api/dashboards/db");
        ForestRequest<?> forestRequest = request
                .contentTypeJson()
                .addHeader("Authorization", "Bearer glsa_txmyqjeXArcLsDwBeuCctfpGfy77Y59s_bdad3797")
                .addBody("dashboard", dashboard)
                .addBody("overwrite", true);
        return forestRequest.execute().toString();
    }

}
