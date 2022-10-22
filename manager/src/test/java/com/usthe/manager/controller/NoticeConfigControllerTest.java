package com.usthe.manager.controller;

import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.entity.manager.NoticeRule;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.service.TagService;
import com.usthe.manager.service.impl.NoticeConfigServiceImpl;
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

import static org.junit.jupiter.api.Assertions.*;
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
        List<NoticeRule.TagItem> tags = new ArrayList<>();
        NoticeRule.TagItem tagItem = new NoticeRule.TagItem();
        tagItem.setName("key1");
        tagItem.setValue("value1");
        tags.add(tagItem);

        NoticeRule noticeRule = new NoticeRule();
        noticeRule.setId(87584674384L);
        noticeRule.setName("dispatch-1");
        noticeRule.setReceiverId(4324324L);
        noticeRule.setReceiverName("tom");
        noticeRule.setCreator("tom");
        noticeRule.setModifier("tom");
        noticeRule.setTags(tags);

        return noticeRule;
    }

    public NoticeReceiver getNoticeReceiver(){
        NoticeReceiver noticeReceiver = new NoticeReceiver();
         noticeReceiver.setName("tom");
         noticeReceiver.setPhone("18923435643");
         noticeReceiver.setEmail("tom@qq.com");
         noticeReceiver.setHookUrl("https://www.tancloud.cn");
         noticeReceiver.setType((byte) 1);

        return noticeReceiver;

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
                .content(GsonUtil.toJson(noticeReceiver)))
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
                        .content(GsonUtil.toJson(noticeReceiver)))
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
                        .content(GsonUtil.toJson(noticeRule)))
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
                        .content(GsonUtil.toJson(noticeRule)))
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
                        .content(GsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("Notify service not available, please check config!"))
                .andReturn();


        Mockito.when(noticeConfigService.sendTestMsg(noticeReceiver))
                .thenReturn(true);

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/notice/receiver/send-test-msg")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GsonUtil.toJson(noticeReceiver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
//                .andExpect(jsonPath("$.msg").value("Notify service not available, please check config!"))
                .andReturn();
    }
}