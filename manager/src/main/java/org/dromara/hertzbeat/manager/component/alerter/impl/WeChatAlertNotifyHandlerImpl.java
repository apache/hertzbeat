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

package org.dromara.hertzbeat.manager.component.alerter.impl;

import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/**
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
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
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
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
        JsonParser parser = new JsonParser();
        JsonObject jsonObject = parser.parse(response.body()).getAsJsonObject();
        String accessToken = null;
        if (jsonObject.has(ACCESS_TOKEN)) {
            accessToken = jsonObject.get(ACCESS_TOKEN).getAsString();
        } else {
            // todo 处理错误情况，例如记录日志或抛出异常
            log.error("Failed to obtain ACCESS_TOKEN from response: {}", response.body());
        }

        return accessToken;
    }

    private String constructMessageContent(NoticeReceiver receiver, NoticeTemplate noticeTemplate, Alert alert) {
        // 示例：构造一个文本消息内容
        JsonObject messageContent = new JsonObject();
        messageContent.addProperty("msgtype", "text");
        JsonObject textContent = new JsonObject();

        // 这里可以根据NoticeTemplate和Alert信息构造消息内容
        String alertMessage = String.format("警告：%s\n详情：%s", alert.getAlertDefineId(), alert.getContent());
        textContent.addProperty("content", alertMessage);
        messageContent.add("text", textContent);

        // 如果需要@某人，可以在这里添加
        JsonObject atInfo = new JsonObject();
        atInfo.addProperty("isAtAll", false); // 是否@所有人
        messageContent.add("at", atInfo);

        // 返回JSON字符串
        return messageContent.toString();
    }

    private void sendMessage(String accessToken, String messageContent) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI(SEND_MESSAGE_URL + accessToken))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(messageContent))
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        // 检查消息是否成功发送
        log.info("Message sent response: {}", response.body());
    }

    @Override
    public byte type() {
        return 3;
    }
}
