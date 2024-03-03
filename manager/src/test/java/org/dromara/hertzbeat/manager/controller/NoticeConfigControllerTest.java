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

package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.service.impl.NoticeConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link NoticeConfigController}
 */
@ExtendWith(MockitoExtension.class)
class NoticeConfigControllerTest {

    private MockMvc mockMvc;

    @Mock
    private NoticeConfigServiceImpl noticeConfigService;

    @InjectMocks
    private NoticeConfigController noticeConfigController;


    public NoticeRule getNoticeRule(){
        List<TagItem> tags = new ArrayList<>();
        TagItem tagItem = new TagItem();
        tagItem.setName("key1");
        tagItem.setValue("value1");
        tags.add(tagItem);

        NoticeRule noticeRule = new NoticeRule();
        noticeRule.setId(87584674384L);
        noticeRule.setName("dispatch-1");
        noticeRule.setReceiverId(4324324L);
        noticeRule.setReceiverName("tom");
        noticeRule.setTemplateId(4324324L);
        noticeRule.setTemplateName("test");
        noticeRule.setCreator("tom");
        noticeRule.setModifier("tom");
        noticeRule.setTags(tags);

        return noticeRule;
    }

    public NoticeReceiver getNoticeReceiver(){

        NoticeReceiver noticeReceiver = new NoticeReceiver();
        noticeReceiver.setName("tom");
        noticeReceiver.setId(5L);
        noticeReceiver.setAccessToken("c03a568a306f8fd84dab51ff03cf6af6ba676a3be940c904e1df2de34853739d");
        noticeReceiver.setEmail("2762242004@qq.com");
        noticeReceiver.setHookUrl("https://www.tancloud.cn");
        noticeReceiver.setType((byte) 5);

        return noticeReceiver;

    }
    public NoticeTemplate getNoticeTemplate(){
        NoticeTemplate template = new NoticeTemplate();
        template.setId(5L);
        template.setName("Dingding");
        template.setContent("[${title}]\n" +
                "${targetLabel} : ${target}\n" +
                "<#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>\n" +
                "<#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>\n" +
                "${priorityLabel} : ${priority}\n" +
                "${triggerTimeLabel} : ${triggerTime}\n" +
                "${contentLabel} : ${content}");
        template.setType((byte) 5);

        return template;

    }


    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(noticeConfigController).build();
    }

    @Test
    void addNewNoticeReceiver() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();
        System.out.println(noticeReceiver);
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/notice/receiver")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();
    }

    @Test
    void editNoticeReceiver() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();
        System.out.println(noticeReceiver);
        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/notice/receiver")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Edit success"))
                .andReturn();

    }

    @Test
    void deleteNoticeReceiver() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();

        Mockito.when(noticeConfigService.getReceiverById(7565463543L))
                .thenReturn(noticeReceiver);
        Mockito.when(noticeConfigService.getReceiverById(6565463543L))
                .thenReturn(null);


        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/notice/receiver/{id}", 6565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("The relevant information of the recipient could not be found, please check whether the parameters are correct"))
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/notice/receiver/{id}", 7565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();

    }

    @Test
    void getReceivers() throws Exception {

        //Mockito.when(noticeConfigService.getNoticeReceivers())
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/receivers?name={name}", "tom"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void addNewNoticeRule() throws Exception {
        NoticeRule noticeRule = getNoticeRule();
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/notice/rule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeRule)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();
    }

    @Test
    void editNoticeRule() throws Exception {
        NoticeRule noticeRule = getNoticeRule();
        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/notice/rule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeRule)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Edit success"))
                .andReturn();
    }

    @Test
    void deleteNoticeRule() throws Exception {
        NoticeRule noticeRule = getNoticeRule();

        Mockito.when(noticeConfigService.getNoticeRulesById(7565463543L))
                .thenReturn(noticeRule);
        Mockito.when(noticeConfigService.getNoticeRulesById(6565463543L))
                .thenReturn(null);


        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/notice/rule/{id}", 6565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("The specified notification rule could not be queried, please check whether the parameters are correct"))
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/notice/rule/{id}", 7565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();
    }

    @Test
    void getRules() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/rules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/rules?name={name}", "tom"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


    @Test
    void sendTestMsg() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();
        Mockito.when(noticeConfigService.sendTestMsg(noticeReceiver))
                .thenReturn(false);

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/notice/receiver/send-test-msg")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Notify service not available, please check config!"))
                .andReturn();


        Mockito.when(noticeConfigService.sendTestMsg(noticeReceiver))
                .thenReturn(true);

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/notice/receiver/send-test-msg")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
//                .andExpect(jsonPath("$.msg").value("Notify service not available, please check config!"))
                .andReturn();
    }
}
