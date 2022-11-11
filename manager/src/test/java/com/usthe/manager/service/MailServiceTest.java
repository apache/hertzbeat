package com.usthe.manager.service;

import com.usthe.alert.AlerterProperties;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.manager.service.impl.MailServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.ResourceBundle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;

/**
 * Test case for {@link MailService}
 */
@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Spy
    @InjectMocks
    private MailServiceImpl mailService;

    @Mock
    private TemplateEngine templateEngine;

    @Mock
    private AlerterProperties alerterProperties;

    @Mock
    private ResourceBundle bundle;

    @Mock
    private Alert alert;

    @BeforeEach
    void setUp() {
        lenient().when(templateEngine.process(eq("mailAlarm"), any(Context.class))).thenReturn("result");
    }

    @Test
    void buildAlertHtmlTemplate() {
        assertEquals("result", mailService.buildAlertHtmlTemplate(alert));
        assertNotNull(mailService.buildAlertHtmlTemplate(alert));
    }
}