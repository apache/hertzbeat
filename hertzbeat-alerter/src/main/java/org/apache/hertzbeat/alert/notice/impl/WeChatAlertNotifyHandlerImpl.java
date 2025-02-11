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

package org.apache.hertzbeat.alert.notice.impl;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.http.HttpHeaders;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;

/**
 * Send alarm information through WeChat
 */
final class WeChatAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {
    private static final Logger log = LoggerFactory.getLogger(WeChatAlertNotifyHandlerImpl.class);
    private static final String CORP_ID = "YOUR_CORP_ID";
    private static final String CORP_SECRET = "YOUR_CORP_SECRET";
    private static final String AGENT_ID = "YOUR_AGENT_ID";
    private static final String GET_TOKEN_URL = "https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=" + CORP_ID + "&corpsecret=" + CORP_SECRET;
    private static final String SEND_MESSAGE_URL = "https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=";
    private static final String ACCESS_TOKEN = "access_token";

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        try {
            String accessToken = getAccessToken();
            String messageContent = constructMessageContent(receiver, noticeTemplate, alert);
            sendMessage(accessToken, messageContent);
        } catch (Exception e) {
            log.error("Failed to send WeChat alert", e);
        }
    }

    private String getAccessToken() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(GET_TOKEN_URL))
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonObject jsonObject = JsonParser.parseString(response.body()).getAsJsonObject();
        String accessToken = null;
        if (jsonObject.has(ACCESS_TOKEN)) {
            accessToken = jsonObject.get(ACCESS_TOKEN).getAsString();
        } else {
            // todo Handle error conditions, such as logging or throwing exceptions
            log.error("Failed to obtain ACCESS_TOKEN from response: {}", response.body());
        }

        return accessToken;
    }

    private String constructMessageContent(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) {
        // example: construct a text message content
        JsonObject messageContent = new JsonObject();
        messageContent.addProperty("msgtype", "text");
        JsonObject textContent = new JsonObject();

        // Here you can construct the message content based on the NoticeTemplate and Alert information
        String alertMessage = "Alert message content";
        textContent.addProperty("content", alertMessage);
        messageContent.add("text", textContent);

        // if need @ someone, you can add here
        JsonObject atInfo = new JsonObject();
        atInfo.addProperty("isAtAll", false); // Whether @everyone
        messageContent.add("at", atInfo);

        // return JSON string
        return messageContent.toString();
    }

    private void sendMessage(String accessToken, String messageContent) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(SEND_MESSAGE_URL + accessToken))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(messageContent))
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // Check if the message was sent successfully
        log.info("Message sent response: {}", response.body());
    }

    @Override
    public byte type() {
        return 3;
    }
}
