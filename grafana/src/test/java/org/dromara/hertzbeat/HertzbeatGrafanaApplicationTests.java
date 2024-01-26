package org.dromara.hertzbeat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.model.ImportBo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.File;
import java.io.IOException;
import java.sql.SQLOutput;
import java.util.HashMap;
import java.util.Map;

@SpringBootTest
class HertzbeatGrafanaApplicationTests {
    @Autowired
    private ObjectMapper objectMapper;
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

    @Test
    void getTemplate() {
        String apiUrl = "http://82.157.76.80:3000/api/gnet/dashboards/10991";
        HttpClient httpClient = HttpClients.createDefault();
        HttpGet httpGet = new HttpGet(apiUrl);

        try {
            HttpResponse response = httpClient.execute(httpGet);
            HttpEntity responseEntity = response.getEntity();
            String responseBody = EntityUtils.toString(responseEntity);
            if (response.getStatusLine().getStatusCode() == 200) {
                System.out.println(responseBody);
            } else {
                System.out.println("Failed to create dashboard. Response: " + responseBody);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void importTemplate() throws IOException {
        File file = new File("H:\\Java\\hertzbeat\\grafana\\src\\main\\resources\\template.json");
        Object json = objectMapper.readValue(file, Object.class);
        String jsonString = objectMapper.writeValueAsString(json);
        System.out.println(jsonString);

        String apiUrl = "http://82.157.76.80:3000/api/dashboards/import";
        HttpClient httpClient = HttpClients.createDefault();
        HttpPost httpPost = new HttpPost(apiUrl);
        httpPost.setHeader(HttpHeaders.CONTENT_TYPE, ContentType.APPLICATION_JSON.toString());
        ImportBo importBo = new ImportBo();
        getTemplate();
        importBo.setDashboard(jsonString);
        importBo.setFolderId(0);
        importBo.setFolderUid("");
        importBo.setOverwrite(true);
        importBo.setPath("");
        importBo.setPluginId("");
        ImportBo.Input input = new ImportBo.Input();
        input.setName("DS_PROMETHEUS");
        input.setPluginId("prometheus");
        input.setType("datasource");
        input.setValue("prometheus");
        importBo.setInputs(Lists.newArrayList(input));
        String requestBody = JsonUtil.toJson(importBo);
        StringEntity requestEntity = new StringEntity(requestBody, ContentType.APPLICATION_JSON);
        httpPost.setEntity(requestEntity);
        try {
            HttpResponse response = httpClient.execute(httpPost);
            HttpEntity responseEntity = response.getEntity();
            String responseBody = EntityUtils.toString(responseEntity);
            if (response.getStatusLine().getStatusCode() == 200) {
                System.out.println(responseBody);
            } else {
                System.out.println("Failed to create dashboard. Response: " + responseBody);
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }
}
