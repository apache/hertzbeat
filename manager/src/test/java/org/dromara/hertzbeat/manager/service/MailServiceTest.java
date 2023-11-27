package org.dromara.hertzbeat.manager.service;

import freemarker.template.TemplateException;
import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.service.impl.MailServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.ResourceBundle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

/**
 * Test case for {@link MailService}
 */
@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Spy
    @InjectMocks
    private MailServiceImpl mailService;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;


    @Test
    void buildAlertHtmlTemplate() throws TemplateException, IOException {
        Alert alert=new Alert();
        NoticeTemplate noticeTemplate=new NoticeTemplate();
        alert.setTarget("Test Target");
        alert.setContent("Test");
        alert.setTriggerTimes(1);
        alert.setFirstAlarmTime(System.currentTimeMillis());
        alert.setLastAlarmTime(System.currentTimeMillis());
        alert.setPriority(CommonConstants.ALERT_PRIORITY_CODE_CRITICAL);
        noticeTemplate.setId(1L);
        noticeTemplate.setName("test");
        noticeTemplate.setContent("result");

        assertEquals("result", mailService.buildAlertHtmlTemplate(alert,noticeTemplate));
        assertNotNull(mailService.buildAlertHtmlTemplate(alert,noticeTemplate));
    }
}
