package org.dromara.hertzbeat.manager.component.alerter.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.util.StringUtils;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * Test case for {@link WebHookAlertNotifyHandlerImpl}
 */
@Slf4j
class WebHookAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {

    @Resource
    private WebHookAlertNotifyHandlerImpl webHookAlertNotifyHandler;

    @BeforeEach
    void setUp() {
    }

    @Test
    void send() {
    }

    @Test
    void type() {
    }
}