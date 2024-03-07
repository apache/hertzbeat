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

package org.dromara.hertzbeat.manager;

import org.dromara.hertzbeat.alert.AlerterProperties;
import org.dromara.hertzbeat.alert.AlerterWorkerPool;
import org.dromara.hertzbeat.alert.calculate.CalculateAlarm;
import org.dromara.hertzbeat.alert.controller.AlertDefineController;
import org.dromara.hertzbeat.alert.controller.AlertDefinesController;
import org.dromara.hertzbeat.alert.controller.AlertsController;
import org.dromara.hertzbeat.alert.service.impl.AlertDefineServiceImpl;
import org.dromara.hertzbeat.alert.service.impl.AlertServiceImpl;
import org.dromara.hertzbeat.collector.collect.database.JdbcSpiLoader;
import org.dromara.hertzbeat.collector.collect.http.promethus.PrometheusParseCreater;
import org.dromara.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.dromara.hertzbeat.collector.dispatch.CommonDispatcher;
import org.dromara.hertzbeat.collector.dispatch.DispatchProperties;
import org.dromara.hertzbeat.collector.dispatch.MetricsCollectorQueue;
import org.dromara.hertzbeat.collector.dispatch.WorkerPool;
import org.dromara.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.dromara.hertzbeat.collector.dispatch.timer.TimerDispatcher;
import org.dromara.hertzbeat.collector.dispatch.unit.impl.DataSizeConvert;
import org.dromara.hertzbeat.common.config.AviatorConfiguration;
import org.dromara.hertzbeat.common.config.CommonConfig;
import org.dromara.hertzbeat.common.config.CommonProperties;
import org.dromara.hertzbeat.common.queue.impl.InMemoryCommonDataQueue;
import org.dromara.hertzbeat.common.service.TencentSmsClient;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.warehouse.WarehouseWorkerPool;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import org.dromara.hertzbeat.warehouse.controller.MetricsDataController;
import org.dromara.hertzbeat.warehouse.store.HistoryIotDbDataStorage;
import org.dromara.hertzbeat.warehouse.store.HistoryTdEngineDataStorage;
import org.dromara.hertzbeat.warehouse.store.RealTimeMemoryDataStorage;
import org.dromara.hertzbeat.warehouse.store.RealTimeRedisDataStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.ApplicationContext;

import javax.annotation.Resource;
import javax.naming.NamingException;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/14
 */
class ManagerTest extends AbstractSpringIntegrationTest {

    @Resource
    private ApplicationContext ctx;

    @Test
    void testAutoImport() {
        // test alert module
        assertNotNull(ctx.getBean(AlertDefineServiceImpl.class));
        assertNotNull(ctx.getBean(AlertServiceImpl.class));
        assertNotNull(ctx.getBean(AlertDefineController.class));
        assertNotNull(ctx.getBean(AlerterWorkerPool.class));
        assertNotNull(ctx.getBean(AlerterProperties.class));
        assertNotNull(ctx.getBean(CalculateAlarm.class));
        assertNotNull(ctx.getBean(AlertsController.class));
        assertNotNull(ctx.getBean(AlertDefinesController.class));

        // test collector module
        assertNotNull(ctx.getBean(TimerDispatcher.class));
        assertNotNull(ctx.getBean(CommonDispatcher.class));
        assertNotNull(ctx.getBean(DispatchProperties.class));
        assertNotNull(ctx.getBean(MetricsCollectorQueue.class));
        assertNotNull(ctx.getBean(WorkerPool.class));
        assertNotNull(ctx.getBean(CollectJobService.class));
        assertNotNull(ctx.getBean(JdbcSpiLoader.class));
        assertNotNull(ctx.getBean(PrometheusParseCreater.class));
        assertNotNull(ctx.getBean(DataSizeConvert.class));
        assertNotNull(ctx.getBean(CollectStrategyFactory.class));

        // test common module
        assertNotNull(ctx.getBean(CommonProperties.class));
        assertNotNull(ctx.getBean(CommonConfig.class));
        assertNotNull(ctx.getBean(AviatorConfiguration.class));
        assertNotNull(ctx.getBean(InMemoryCommonDataQueue.class));
        // condition on common.sms.tencent.app-id
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(TencentSmsClient.class));
        assertNotNull(ctx.getBean(SpringContextHolder.class));

        // test warehouse module
        assertNotNull(ctx.getBean(WarehouseProperties.class));
        assertNotNull(ctx.getBean(WarehouseWorkerPool.class));

        // default DataStorage is RealTimeMemoryDataStorage
        assertNotNull(ctx.getBean(RealTimeMemoryDataStorage.class));
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(RealTimeRedisDataStorage.class));
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(HistoryTdEngineDataStorage.class));
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(HistoryIotDbDataStorage.class));

        assertNotNull(ctx.getBean(MetricsDataController.class));
    }

    @Test
    void testJNDI() throws NamingException {
//        System.setProperty("jdk.jndi.object.factoriesFilter", "!com.zaxxer.hikari.HikariJNDIFactory");
        // for CI
//        InitialContext initialContext = new InitialContext();
//        initialContext.lookup("rmi://localhost:1099/Exploit");
    }

}
