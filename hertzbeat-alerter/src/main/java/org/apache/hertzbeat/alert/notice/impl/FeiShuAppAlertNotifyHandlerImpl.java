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

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * FeiShu app alert notify impl
 */
@Component
@Slf4j
public class FeiShuAppAlertNotifyHandlerImpl extends AbstractAlertNotifyHandlerImpl {

    /**
     * get tenant access_token url
     */
    private static final String TENANT_ACCESS_TOKEN_URL = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";

    /**
     * get FeiShu app employee url
     */
    private static final String EMPLOYEE_URL = "https://open.feishu.cn/open-apis/ehr/v1/employees?status=2&status=4&user_id_type=user_id&page_size=100";

    /**
     * send FeiShu app message url
     */
    private static final String APP_MESSAGE_URL = "https://open.feishu.cn/open-apis/im/v1/messages";

    /**
     * send FeiShu app batch message url
     */
    private static final String APP_BATCH_MESSAGE_URL = "https://open.feishu.cn/open-apis/message/v4/batch_send/";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final byte USER_RECEIVE_TYPE = 0;
    private static final byte CHAT_RECEIVE_TYPE = 1;
    private static final byte PART_RECEIVE_TYPE = 2;
    private static final byte ALL_RECEIVE_TYPE = 3;

    @Override
    public void send(NoticeReceiver receiver, NoticeTemplate noticeTemplate, GroupAlert alert) throws AlertNoticeException {
        var appId = receiver.getAppId();
        var appSecret = receiver.getAppSecret();
        var larkReceiveIdType = receiver.getLarkReceiveType();
        try {
            var accessToken = getAccessToken(appId, appSecret);
            var notificationContent = JsonUtil.toJson(renderContent(noticeTemplate, alert));
            JsonNode messageContent = createLarkMessage(receiver, notificationContent);
            switch (larkReceiveIdType) {
                case USER_RECEIVE_TYPE -> {
                    String[] userIds = receiver.getUserId().split(",");
                    if (userIds.length == 1) {
                        sendLarkMessage(accessToken, "user_id", userIds[0], messageContent);
                    } else {
                        sendLarkUserBatchMessage(accessToken, userIds, messageContent);
                    }
                }
                case CHAT_RECEIVE_TYPE -> sendLarkMessage(accessToken, "chat_id", receiver.getChatId(), messageContent);
                case PART_RECEIVE_TYPE ->
                        sendLarkDepartmentBatchMessage(accessToken, receiver.getPartyId().split(","), messageContent);
                case ALL_RECEIVE_TYPE -> {
                    List<String> userIds = new ArrayList<>();
                    getLarkEmployeeUserIds(accessToken, null, userIds);
                    sendLarkUserBatchMessage(accessToken, userIds.toArray(new String[0]), messageContent);
                }
                default -> throw new AlertNoticeException("Invalid larkReceiveIdType: " + larkReceiveIdType);
            }
        } catch (Exception e) {
            throw new AlertNoticeException("[FeiShu App Notify Error] " + e.getMessage());
        }
    }

    @Override
    public byte type() {
        return 14;
    }

    /**
     * Send FeiShu app message to chat or designated personnel
     *
     * @param accessToken    Tenant access token
     * @param receiverIdType FeiShu app send message receiver id type: user_id, chat_id
     * @param receiverId     FeiShu app user id or chat id
     * @param messageContent Message content
     * @see <a href="https://open.feishu.cn/document/server-docs/im-v1/batch_message/send-messages-in-batches">send message</a>
     */
    private void sendLarkMessage(String accessToken, String receiverIdType, String receiverId, JsonNode messageContent) throws JsonProcessingException {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        FeiShuAppMessageDto messageDto = FeiShuAppMessageDto.builder()
                .receiveId(receiverId)
                .content(escapedCompactJson(messageContent))
                .build();
        HttpEntity<FeiShuAppMessageDto> request = new HttpEntity<>(messageDto, headers);
        call(APP_MESSAGE_URL + "?receive_id_type=" + receiverIdType, request, HttpMethod.POST, FeiShuAppResponse.class);
    }

    /**
     * Send FeiShu app department batch message
     *
     * @param accessToken    Tenant access token
     * @param partyIds       FeiShu app department ids
     * @param messageContent Message content
     * @see <a href="https://open.feishu.cn/document/server-docs/im-v1/batch_message/send-messages-in-batches">send batch message</a>
     */
    private void sendLarkDepartmentBatchMessage(String accessToken, String[] partyIds, JsonNode messageContent) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        FeiShuAppBatchMessageDto batchMessageDto = FeiShuAppBatchMessageDto.builder()
                .departmentIds(partyIds)
                .card(messageContent)
                .build();
        HttpEntity<FeiShuAppBatchMessageDto> request = new HttpEntity<>(batchMessageDto, headers);
        call(APP_BATCH_MESSAGE_URL, request, HttpMethod.POST, FeiShuAppResponse.class);
    }

    /**
     * Send FeiShu app batch message to user
     *
     * @param accessToken    Tenant access token
     * @param userIds        FeiShu app user ids
     * @param messageContent Message content
     * @see <a href="https://open.feishu.cn/document/server-docs/im-v1/batch_message/send-messages-in-batches">send batch message</a>
     */
    private void sendLarkUserBatchMessage(String accessToken, String[] userIds, JsonNode messageContent) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        FeiShuAppBatchMessageDto batchMessageDto = FeiShuAppBatchMessageDto.builder()
                .userIds(userIds)
                .card(messageContent)
                .build();
        HttpEntity<FeiShuAppBatchMessageDto> request = new HttpEntity<>(batchMessageDto, headers);
        FeiShuAppResponse call = call(APP_BATCH_MESSAGE_URL, request, HttpMethod.POST, FeiShuAppResponse.class);
    }

    /**
     * Get FeiShu app tenant access token
     *
     * @param appId     Unique identifier for the application, obtained after creating the application
     * @param appSecret Application key, obtained after creating the application
     * @return Tenant access token
     * @see <a href="https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal">tenant_access_token</a>
     */
    private String getAccessToken(String appId, String appSecret) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        FeiShuAppAccessTokenDto accessTokenRequest = FeiShuAppAccessTokenDto.builder()
                .appId(appId)
                .appSecret(appSecret)
                .build();
        HttpEntity<FeiShuAppAccessTokenDto> request = new HttpEntity<>(accessTokenRequest, headers);
        FeiShuAppAccessTokenResponse data = call(TENANT_ACCESS_TOKEN_URL, request, HttpMethod.POST, FeiShuAppAccessTokenResponse.class);
        return data.getTenantAccessToken();
    }


    /**
     * Get FeiShu app employee user ids
     *
     * @param accessToken FeiShu app tenant access token
     * @param pageToken   Paging marker, left blank for the first request, indicating traversal from scratch;
     *                    When there are more items in the pagination query result, a new page_token will be returned at the same time.
     *                    The next iteration can use this page_token to obtain the query result
     * @param userIds     Collection for recursive padding
     * @see <a href="https://open.feishu.cn/document/server-docs/ehr-v1/list?appId=cli_a999532b1f52900b">https://open.feishu.cn/open-apis/ehr/v1/employees</a>
     */
    private void getLarkEmployeeUserIds(String accessToken, String pageToken, List<String> userIds) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        HttpEntity<String> request = new HttpEntity<>(headers);
        var url = StringUtils.isNotBlank(pageToken) ? EMPLOYEE_URL + "&page_token=" + pageToken : EMPLOYEE_URL;
        FeiShuAppEmployeeResponse employeeResponse = call(url,
                request,
                HttpMethod.GET,
                FeiShuAppEmployeeResponse.class);
        if (Objects.equals(employeeResponse.getCode(), 0)) {
            userIds.addAll(employeeResponse.getData().getItems().stream().map(FeiShuAppEmployeeResponse.Employee::getUserId).toList());
            var hasMore = employeeResponse.getData().getHasMore();
            if (Boolean.TRUE.equals(hasMore)) {
                getLarkEmployeeUserIds(accessToken, employeeResponse.getData().getPageToken(), userIds);
            }
        }

    }

    private <R extends FeiShuAppResponse, E> R call(String url, HttpEntity<E> request, HttpMethod httpMethod, Class<R> responseType) {
        ResponseEntity<R> response = restTemplate.exchange(url, httpMethod, request, responseType);
        if (Objects.nonNull(response.getBody()) && !Objects.equals(response.getBody().getCode(), 0)) {
            log.warn("Send FeiShu App Error: {}", response.getBody().getMsg());
            throw new AlertNoticeException("Http StatusCode " + response.getStatusCode() + " Error: " + response.getBody().getMsg());
        }
        return response.getBody();
    }

    private JsonNode createLarkMessage(NoticeReceiver receiver, String notificationContent) throws JsonProcessingException {
        String larkCardMessage = """
                {
                      "schema": "2.0",
                      "config": {
                          "update_multi": true,
                          "locales": [
                              "en_us",
                              "zh_cn"
                          ],
                          "style": {
                              "text_size": {
                                  "normal_v2": {
                                      "default": "normal",
                                      "pc": "normal",
                                      "mobile": "heading"
                                  }
                              }
                          }
                      },
                      "body": {
                          "direction": "vertical",
                          "padding": "12px 12px 12px 12px",
                          "elements": [
                              {
                                  "tag": "markdown",
                                  "content": "%s",
                                  "i18n_content": {
                                      "en_us": ""
                                  },
                                  "text_align": "left",
                                  "text_size": "normal_v2",
                                  "margin": "0px 0px 0px 0px"
                              },
                              {
                                  "tag": "hr",
                                  "margin": "0px 0px 0px 0px"
                              },
                              {
                                  "tag": "column_set",
                                  "horizontal_align": "left",
                                  "columns": [
                                      {
                                          "tag": "column",
                                          "width": "weighted",
                                          "elements": [
                                              {
                                                  "tag": "button",
                                                  "text": {
                                                      "tag": "plain_text",
                                                      "content": "登入控制台",
                                                      "i18n_content": {
                                                          "en_us": "Login In"
                                                      }
                                                  },
                                                  "type": "default",
                                                  "width": "default",
                                                  "size": "medium",
                                                  "behaviors": [
                                                      {
                                                          "type": "open_url",
                                                          "default_url": "%s",
                                                          "pc_url": "",
                                                          "ios_url": "",
                                                          "android_url": ""
                                                      }
                                                  ]
                                              }
                                          ],
                                          "direction": "horizontal",
                                          "vertical_spacing": "8px",
                                          "horizontal_align": "left",
                                          "vertical_align": "top",
                                          "weight": 1
                                      }
                                  ],
                                  "margin": "0px 0px 0px 0px"
                              }
                          ]
                      },
                      "header": {
                          "title": {
                              "tag": "plain_text",
                              "content": "HertzBeat 告警",
                              "i18n_content": {
                                  "en_us": "HertzBeat Alarm"
                              }
                          },
                          "subtitle": {
                              "tag": "plain_text",
                              "content": ""
                          },
                          "template": "red",
                          "padding": "12px 12px 12px 12px"
                      }
                  }
                """;
        Byte larkReceiveIdType = receiver.getLarkReceiveType();
        String userId = receiver.getUserId();
        String atUserElement = "";
        if (Objects.equals(larkReceiveIdType, CHAT_RECEIVE_TYPE) && StringUtils.isNotBlank(userId)) {
            atUserElement = "\\n" + Arrays.stream(userId.split(","))
                    .map(id -> "<at id=" + id + "></at>")
                    .collect(Collectors.joining(" "));
        }

        if (notificationContent.startsWith("\"") && notificationContent.endsWith("\"")) {
            notificationContent = StringUtils.removeStart(notificationContent, "\"");
            notificationContent = StringUtils.removeEnd(notificationContent, "\"");
        }
        String jsonStr = String.format(larkCardMessage,
                notificationContent.replace("\"", "\\\"") + atUserElement,
                alerterProperties.getConsoleUrl());
        return OBJECT_MAPPER.readTree(jsonStr);
    }


    private String escapedCompactJson(JsonNode json) throws JsonProcessingException {
        return OBJECT_MAPPER.writeValueAsString(json);
    }

    /**
     * feiShu app response
     */
    @Data
    protected static class FeiShuAppResponse {

        private Integer code;

        private String msg;

    }

    /**
     * FeiShu app message get tenant access token request
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    protected static class FeiShuAppAccessTokenDto {

        @JsonProperty("app_id")
        private String appId;

        @JsonProperty("app_secret")
        private String appSecret;
    }


    /**
     * FeiShu app message get tenant access token response
     */
    @EqualsAndHashCode(callSuper = true)
    @Data
    protected static class FeiShuAppAccessTokenResponse extends FeiShuAppResponse {

        @JsonProperty("tenant_access_token")
        private String tenantAccessToken;
    }

    /**
     * FeiShu app employee response
     */
    @EqualsAndHashCode(callSuper = true)
    @Data
    protected static class FeiShuAppEmployeeResponse extends FeiShuAppResponse {

        private EmployeeResponseData data;

        @Data
        private static class EmployeeResponseData {
            @JsonProperty("page_token")
            private String pageToken;

            @JsonProperty("has_more")
            private Boolean hasMore;

            private List<Employee> items;
        }

        @Data
        private static class Employee {

            @JsonProperty("user_id")
            private String userId;
        }
    }


    /**
     * FeiShu app message request
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    protected static class FeiShuAppMessageDto {

        @JsonProperty("receive_id")
        private String receiveId;

        @Builder.Default
        @JsonProperty("msg_type")
        private String msgType = "interactive";

        @JsonProperty("content")
        private String content;

        @Builder.Default
        private final String uuid = UUID.randomUUID().toString();

    }

    /**
     * FeiShu app batch message request
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    protected static class FeiShuAppBatchMessageDto {

        @Builder.Default
        @JsonProperty("msg_type")
        private final String msgType = "interactive";

        private JsonNode card;

        @JsonProperty("department_ids")
        private String[] departmentIds;

        @JsonProperty("user_ids")
        private String[] userIds;

    }


}
