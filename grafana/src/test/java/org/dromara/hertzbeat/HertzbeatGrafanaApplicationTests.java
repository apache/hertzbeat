package org.dromara.hertzbeat;

import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@SpringBootTest
class HertzbeatGrafanaApplicationTests {

    @Test
    void contextLoads() {
        String apiUrl = "http://82.157.76.80:3000/api/dashboards/db";
//        String apiKey = "your-api-key";
        String dashboardId = "10991";

        HttpClient httpClient = HttpClients.createDefault();
        HttpPost httpPost = new HttpPost(apiUrl);
//        httpPost.setHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
        httpPost.setHeader(HttpHeaders.CONTENT_TYPE, ContentType.APPLICATION_JSON.toString());

        Map<String, Object> requestJson = new HashMap<>();
        requestJson.put("dashboard", dashboardId);
        requestJson.put("overwrite", false);
        String requestBody = JsonUtil.toJson(requestJson);


        StringEntity requestEntity = new StringEntity(requestBody, ContentType.APPLICATION_JSON);
        httpPost.setEntity(requestEntity);

        try {
            HttpResponse response = httpClient.execute(httpPost);
            HttpEntity responseEntity = response.getEntity();
            String responseBody = EntityUtils.toString(responseEntity);

            if (response.getStatusLine().getStatusCode() == 200) {
                System.out.println("Dashboard created successfully!");
            } else {
                System.out.println("Failed to create dashboard. Response: " + responseBody);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }


}
