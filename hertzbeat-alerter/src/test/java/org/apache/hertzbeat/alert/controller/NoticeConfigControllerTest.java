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

package org.apache.hertzbeat.alert.controller;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.alert.service.impl.NoticeConfigServiceImpl;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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


    public NoticeRule getNoticeRule() {
        NoticeRule noticeRule = new NoticeRule();
        noticeRule.setId(87584674384L);
        noticeRule.setName("dispatch-1");
        noticeRule.setReceiverId(List.of(4324324L));
        noticeRule.setReceiverName(List.of("tom"));
        noticeRule.setTemplateId(4324324L);
        noticeRule.setTemplateName("test");
        noticeRule.setCreator("tom");
        noticeRule.setModifier("tom");

        return noticeRule;
    }

    public NoticeReceiver getNoticeReceiver() {

        NoticeReceiver noticeReceiver = new NoticeReceiver();
        noticeReceiver.setName("tom");
        noticeReceiver.setId(5L);
        noticeReceiver.setAccessToken("c03a568a306f8fd84dab51ff03cf6af6ba676a3be940c904e1df2de34853739d");
        noticeReceiver.setEmail("2762242004@qq.com");
        noticeReceiver.setHookUrl("https://www.tancloud.cn");
        noticeReceiver.setType((byte) 5);
        return noticeReceiver;

    }

    public NoticeTemplate getNoticeTemplate() {
        NoticeTemplate template = new NoticeTemplate();
        template.setId(5L);
        template.setName("Dingding");
        template.setContent("""
                [${title}]
                ${targetLabel} : ${target}
                <#if (monitorId??)>${monitorIdLabel} : ${monitorId} </#if>
                <#if (monitorName??)>${monitorNameLabel} : ${monitorName} </#if>
                ${priorityLabel} : ${priority}
                ${triggerTimeLabel} : ${triggerTime}
                ${contentLabel} : ${content}""");
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
        this.mockMvc.perform(post("/api/notice/receiver")
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
        this.mockMvc.perform(put("/api/notice/receiver")
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

        when(noticeConfigService.getReceiverById(7565463543L))
                .thenReturn(noticeReceiver);
        when(noticeConfigService.getReceiverById(6565463543L))
                .thenReturn(null);


        this.mockMvc.perform(delete("/api/notice/receiver/{id}", 6565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("The relevant information of the recipient could not be found, please check whether the parameters are correct"))
                .andReturn();

        this.mockMvc.perform(delete("/api/notice/receiver/{id}", 7565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();

    }

    @Test
    void getReceivers() throws Exception {
        NoticeReceiver receiver1 = new NoticeReceiver();
        receiver1.setId(1L);
        receiver1.setName("Receiver1");

        NoticeReceiver receiver2 = new NoticeReceiver();
        receiver2.setId(2L);
        receiver2.setName("Receiver2");

        Page<NoticeReceiver> receiverPage = new PageImpl<>(
                Arrays.asList(receiver1, receiver2),
                PageRequest.of(0, 8, Sort.by("id").descending()),
                2
        );

        when(noticeConfigService.getNoticeReceivers("Receiver", 0, 8)).thenReturn(receiverPage);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/receivers")
                        .param("name", "Receiver")
                        .param("pageIndex", "0")
                        .param("pageSize", "8")
                        .param("sort", "id")
                        .param("order", "desc")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("Receiver1"))
                .andExpect(jsonPath("$.data.content[1].id").value(2))
                .andExpect(jsonPath("$.data.content[1].name").value("Receiver2"))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.size").value(8))
                .andExpect(jsonPath("$.data.number").value(0));
    }

    @Test
    void getReceiverById() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();
        when(noticeConfigService.getReceiverById(7565463543L))
                .thenReturn(noticeReceiver);
        when(noticeConfigService.getReceiverById(6565463543L))
                .thenReturn(null);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/receiver/{id}", 6565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("The relevant information of the recipient could not be found, please check whether the parameters are correct or refresh the page"))
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/receiver/{id}", 7565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void addNewNoticeRule() throws Exception {
        NoticeRule noticeRule = getNoticeRule();
        this.mockMvc.perform(post("/api/notice/rule")
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
        this.mockMvc.perform(put("/api/notice/rule")
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

        when(noticeConfigService.getNoticeRulesById(7565463543L))
                .thenReturn(noticeRule);
        when(noticeConfigService.getNoticeRulesById(6565463543L))
                .thenReturn(null);


        this.mockMvc.perform(delete("/api/notice/rule/{id}", 6565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("The specified notification rule could not be queried, please check whether the parameters are correct"))
                .andReturn();

        this.mockMvc.perform(delete("/api/notice/rule/{id}", 7565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();
    }

    @Test
    void getRules() throws Exception {
        NoticeRule rule1 = new NoticeRule();
        rule1.setId(1L);
        rule1.setName("Rule1");

        NoticeRule rule2 = new NoticeRule();
        rule2.setId(2L);
        rule2.setName("Rule2");

        Page<NoticeRule> rulePage = new PageImpl<>(
                Arrays.asList(rule1, rule2),
                PageRequest.of(0, 8, Sort.by("id").descending()),
                2
        );

        when(noticeConfigService.getNoticeRules("Rule", 0, 8)).thenReturn(rulePage);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/rules")
                        .param("name", "Rule")
                        .param("pageIndex", "0")
                        .param("pageSize", "8")
                        .param("sort", "id")
                        .param("order", "desc")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("Rule1"))
                .andExpect(jsonPath("$.data.content[1].id").value(2))
                .andExpect(jsonPath("$.data.content[1].name").value("Rule2"))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.size").value(8))
                .andExpect(jsonPath("$.data.number").value(0));
    }

    @Test
    void getRuleById() throws Exception {
        NoticeRule noticeRule = getNoticeRule();
        when(noticeConfigService.getNoticeRulesById(7565463543L))
                .thenReturn(noticeRule);
        when(noticeConfigService.getNoticeRulesById(6565463543L))
                .thenReturn(null);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/rule/{id}", 6565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("The specified notification rule could not be queried, please check whether the parameters are correct or refresh the page"))
                .andReturn();

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/rule/{id}", 7565463543L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }


    @Test
    void sendTestMsg() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();
        when(noticeConfigService.sendTestMsg(noticeReceiver))
                .thenReturn(false);

        this.mockMvc.perform(post("/api/notice/receiver/send-test-msg")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Notify service not available, please check config!"))
                .andReturn();


        when(noticeConfigService.sendTestMsg(noticeReceiver))
                .thenReturn(true);

        this.mockMvc.perform(post("/api/notice/receiver/send-test-msg")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void addNewNoticeTemplate() throws Exception {
        NoticeTemplate noticeTemplate = getNoticeTemplate();
        doNothing().when(noticeConfigService).addNoticeTemplate(noticeTemplate);

        this.mockMvc.perform(post("/api/notice/template")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeTemplate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();

        verify(noticeConfigService).addNoticeTemplate(noticeTemplate);
    }

    @Test
    void editNoticeTemplate() throws Exception {
        NoticeTemplate noticeTemplate = getNoticeTemplate();
        doNothing().when(noticeConfigService).editNoticeTemplate(noticeTemplate);

        this.mockMvc.perform(put("/api/notice/template")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeTemplate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Edit success"))
                .andReturn();

        verify(noticeConfigService).editNoticeTemplate(noticeTemplate);
    }

    @Test
    void deleteNoticeTemplate_Success() throws Exception {
        Long templateId = 1L;
        when(noticeConfigService.getNoticeTemplatesById(templateId)).thenReturn(Optional.of(new NoticeTemplate()));

        mockMvc.perform(delete("/api/notice/template/{id}", templateId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"));

        Mockito.verify(noticeConfigService, Mockito.times(1)).deleteNoticeTemplate(templateId);
    }

    @Test
    void deleteNoticeTemplate_NotFound() throws Exception {
        Long templateId = 1L;
        when(noticeConfigService.getNoticeTemplatesById(templateId)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/notice/template/{id}", templateId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("The specified notification template could not be queried, please check whether the parameters are correct"));

        Mockito.verify(noticeConfigService, Mockito.never()).deleteNoticeTemplate(templateId);
    }

    @Test
    void getTemplates() throws Exception {
        NoticeTemplate template1 = new NoticeTemplate();
        template1.setId(1L);
        template1.setName("Template1");

        NoticeTemplate template2 = new NoticeTemplate();
        template2.setId(2L);
        template2.setName("Template2");

        Page<NoticeTemplate> templatePage = new PageImpl<>(
                Arrays.asList(template1, template2),
                PageRequest.of(0, 8, Sort.by("id").descending()),
                2
        );

        when(noticeConfigService.getNoticeTemplates("Template", true, 0, 8)).thenReturn(templatePage);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/templates")
                        .param("name", "Template")
                        .param("preset", "true")
                        .param("pageIndex", "0")
                        .param("pageSize", "8")
                        .param("sort", "id")
                        .param("order", "desc")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("Template1"))
                .andExpect(jsonPath("$.data.content[1].id").value(2))
                .andExpect(jsonPath("$.data.content[1].name").value("Template2"))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.size").value(8))
                .andExpect(jsonPath("$.data.number").value(0));
    }

    @Test
    void testGetTemplatesById() throws Exception {
        // Mock the service response
        NoticeTemplate template = new NoticeTemplate();
        template.setName("Template1");
        when(noticeConfigService.getNoticeTemplatesById(1010101010L)).thenReturn(Optional.of(template));
        when(noticeConfigService.getNoticeTemplatesById(25857585858L)).thenReturn(Optional.empty());
        // Perform the GET request and verify the response
        this.mockMvc.perform(get("/api/notice/template/{id}", 1010101010L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.name").value("Template1"));
        this.mockMvc.perform(get("/api/notice/template/{id}", 25857585858L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("The specified notification template could not be queried, please check whether the parameters are correct or refresh the page"));
    }

    @Test
    void sendTestMsg_Failure() throws Exception {
        NoticeReceiver noticeReceiver = getNoticeReceiver();
        when(noticeConfigService.sendTestMsg(noticeReceiver)).thenReturn(false);

        this.mockMvc.perform(post("/api/notice/receiver/send-test-msg")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Notify service not available, please check config!"))
                .andReturn();

        verify(noticeConfigService, times(1)).sendTestMsg(noticeReceiver);
    }

    @Test
    void getAllTemplates() throws Exception {
        List<NoticeTemplate> templates = Arrays.asList(new NoticeTemplate(), new NoticeTemplate());
        when(noticeConfigService.getAllNoticeTemplates()).thenReturn(templates);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/templates/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }

    @Test
    void getAllReceivers() throws Exception {
        List<NoticeReceiver> receivers = Arrays.asList(new NoticeReceiver(), new NoticeReceiver());
        when(noticeConfigService.getAllNoticeReceivers()).thenReturn(receivers);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/notice/receivers/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
