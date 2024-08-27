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

package org.apache.hertzbeat.common.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * Test case for {@link SpringContextHolder}
 */
class SpringContextHolderTest {

    private ApplicationContext applicationContext;

    private ConfigurableApplicationContext configurableApplicationContext;

    private SpringContextHolder springContextHolder;

    @BeforeEach
    public void setUp() {

        applicationContext = mock(ApplicationContext.class);
        configurableApplicationContext = mock(ConfigurableApplicationContext.class);
        springContextHolder = new SpringContextHolder();
    }

    @Test
    public void testSetApplicationContext() throws BeansException {

        springContextHolder.setApplicationContext(configurableApplicationContext);

        assertNotNull(SpringContextHolder.getApplicationContext());
    }

    @Test
    public void testGetApplicationContext() {

        springContextHolder.setApplicationContext(applicationContext);
        assertNotNull(SpringContextHolder.getApplicationContext());
    }

    @Test
    public void testGetBeanByClass() {

        Class<String> beanClass = String.class;
        String bean = "bean";
        when(applicationContext.getBean(beanClass)).thenReturn(bean);

        springContextHolder.setApplicationContext(applicationContext);
        String retrievedBean = SpringContextHolder.getBean(beanClass);

        assertEquals(bean, retrievedBean);
    }

    @Test
    public void testShutdown() {

        springContextHolder.setApplicationContext(configurableApplicationContext);
        SpringContextHolder.shutdown();

        verify(configurableApplicationContext, times(1)).close();
    }

    @Test
    public void testIsActive() {

        when(configurableApplicationContext.isActive()).thenReturn(true);
        springContextHolder.setApplicationContext(configurableApplicationContext);
        assertTrue(SpringContextHolder.isActive());
    }

    @Test
    public void testAssertApplicationContextThrowsException() {

        RuntimeException exception = assertThrows(RuntimeException.class, SpringContextHolder::getApplicationContext);
        assertEquals(
                "applicationContext is null, please inject the springContextHolder",
                exception.getMessage()
        );
    }

}
