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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.notice.AlertNoticeException;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.client.RestTemplate;

/**
 * Spring context contract: omitting {@code spring.mail} must not prevent the email handler from starting.
 */
class EmailAlertNotifyHandlerImplContextTest {

    @Test
    void contextStartsWhenSpringMailIsOmitted() {
        try (AnnotationConfigApplicationContext context =
                     new AnnotationConfigApplicationContext(OptionalMailConfiguration.class)) {
            assertTrue(context.getBeansOfType(JavaMailSender.class).isEmpty());
            EmailAlertNotifyHandlerImpl handler = context.getBean(EmailAlertNotifyHandlerImpl.class);

            NoticeReceiver receiver = new NoticeReceiver();
            receiver.setEmail("test@example.com");
            AlertNoticeException exception = assertThrows(AlertNoticeException.class,
                    () -> handler.send(receiver, new NoticeTemplate(), new GroupAlert()));
            assertTrue(exception.getMessage().contains("Mail server is not configured"));
        }
    }

    /**
     * No {@link JavaMailSender} bean and no {@code spring.mail.*} properties.
     */
    @Configuration
    static class OptionalMailConfiguration {

        @Bean
        GeneralConfigDao generalConfigDao() {
            return mock(GeneralConfigDao.class);
        }

        @Bean
        RestTemplate restTemplate() {
            return mock(RestTemplate.class);
        }

        @Bean
        AlerterProperties alerterProperties() {
            return new AlerterProperties();
        }

        @Bean
        EmailAlertNotifyHandlerImpl emailAlertNotifyHandler(ObjectProvider<JavaMailSender> javaMailSenderProvider,
                                                            GeneralConfigDao generalConfigDao) {
            return new EmailAlertNotifyHandlerImpl(javaMailSenderProvider, generalConfigDao);
        }
    }
}
