package org.dromara.hertzbeat.manager.component.alerter.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.util.CommonConstants;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * @description:
 * @author: hdd
 * @create: 2023/04/05
 */
@Slf4j
public class WeChatAppAlertNotifyHandlerImplTest extends AbstractSpringIntegrationTest {


//    @InjectMocks
    @Resource
    private WeChatAppAlertNotifyHandlerImpl weChatAppAlertNotifyHandler;

//    @Mock
//    private RestTemplate restTemplate;

    @Test
    void send() {
        NoticeReceiver receiver = new NoticeReceiver();
        receiver.setId(1L);
        receiver.setName("Mock 告警");
        receiver.setAgentId(1000003);
        receiver.setAppSecret("oUydwn92ey0lnuY0bMwuNa57eNK-20dJn5NEOG-u2uE");
        receiver.setCorpId("ww1a603432904d0dc1");
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTarget("Mock Target");
        Map<String, String> map = new HashMap<>();
        map.put(CommonConstants.TAG_MONITOR_ID, "Mock monitor id");
        map.put(CommonConstants.TAG_MONITOR_NAME, "Mock monitor name");
        alert.setTags(map);
        alert.setContent("mock content");
        alert.setPriority((byte) 0);
        alert.setLastTriggerTime(System.currentTimeMillis());

        weChatAppAlertNotifyHandler.send(receiver, alert);
    }
}
