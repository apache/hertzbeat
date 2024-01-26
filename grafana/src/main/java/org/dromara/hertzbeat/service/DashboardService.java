package org.dromara.hertzbeat.service;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Service;

import java.io.IOException;
@Service
public class DashboardService {
    public String getTemplate() throws IOException {
        String apiUrl = "http://82.157.76.80:3000/api/gnet/dashboards/10991";
        HttpClient httpClient = HttpClients.createDefault();
        HttpGet httpGet = new HttpGet(apiUrl);
        HttpResponse response = httpClient.execute(httpGet);
        int statusCode = response.getStatusLine().getStatusCode();
        if (statusCode == 200) {
            HttpEntity responseEntity = response.getEntity();
            return EntityUtils.toString(responseEntity);
        } else {
            throw new IOException("Error occurred while fetching data. HTTP status code: " + statusCode);
        }
    }
}
