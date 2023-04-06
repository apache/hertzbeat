package org.dromara.hertzbeat.manager.component.alerter.impl;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.web.client.RestTemplate;

/**
 * @description:
 *
 * @create: 2023/04/05
 */
public class WeChatAppAlertNotifyHandlerImplTest {


    @InjectMocks
    private WeChatAppAlertNotifyHandlerImpl weChatAppAlertNotifyHandler;

    @Mock
    private RestTemplate restTemplate;


}
