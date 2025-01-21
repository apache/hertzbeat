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

package org.apache.hertzbeat.manager;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import javax.annotation.Resource;
import javax.naming.NamingException;
import org.apache.hertzbeat.alert.AlerterProperties;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.RealTimeAlertCalculator;
import org.apache.hertzbeat.alert.controller.AlertDefineController;
import org.apache.hertzbeat.alert.controller.AlertDefinesController;
import org.apache.hertzbeat.alert.controller.AlertsController;
import org.apache.hertzbeat.alert.service.impl.AlertDefineServiceImpl;
import org.apache.hertzbeat.alert.service.impl.AlertServiceImpl;
import org.apache.hertzbeat.collector.collect.database.JdbcSpiLoader;
import org.apache.hertzbeat.collector.collect.http.promethus.PrometheusParseCreator;
import org.apache.hertzbeat.collector.collect.strategy.CollectStrategyFactory;
import org.apache.hertzbeat.collector.dispatch.CommonDispatcher;
import org.apache.hertzbeat.collector.dispatch.DispatchProperties;
import org.apache.hertzbeat.collector.dispatch.MetricsCollectorQueue;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.collector.dispatch.timer.TimerDispatcher;
import org.apache.hertzbeat.collector.dispatch.unit.impl.DataSizeConvert;
import org.apache.hertzbeat.common.config.CommonConfig;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.queue.impl.InMemoryCommonDataQueue;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.apache.hertzbeat.alert.service.TencentSmsClient;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.controller.MetricsDataController;
import org.apache.hertzbeat.warehouse.store.history.iotdb.IotDbDataStorage;
import org.apache.hertzbeat.warehouse.store.history.tdengine.TdEngineDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.memory.MemoryDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.redis.RedisDataStorage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.ApplicationContext;

/**
 * Manager Test
 *
 * @version 2.1
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
        assertNotNull(ctx.getBean(RealTimeAlertCalculator.class));
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
        assertNotNull(ctx.getBean(PrometheusParseCreator.class));
        assertNotNull(ctx.getBean(DataSizeConvert.class));
        assertNotNull(ctx.getBean(CollectStrategyFactory.class));

        // test common module
        assertNotNull(ctx.getBean(CommonProperties.class));
        assertNotNull(ctx.getBean(CommonConfig.class));
        assertNotNull(ctx.getBean(InMemoryCommonDataQueue.class));
        // condition on common.sms.tencent.app-id
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(TencentSmsClient.class));
        assertNotNull(ctx.getBean(SpringContextHolder.class));

        // test warehouse module
        assertNotNull(ctx.getBean(WarehouseWorkerPool.class));

        // default DataStorage is RealTimeMemoryDataStorage
        assertNotNull(ctx.getBean(MemoryDataStorage.class));
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(RedisDataStorage.class));
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(TdEngineDataStorage.class));
        assertThrows(NoSuchBeanDefinitionException.class, () -> ctx.getBean(IotDbDataStorage.class));

        assertNotNull(ctx.getBean(MetricsDataController.class));
    }

    @Test
    void testJndi() throws NamingException {
        //System.setProperty("jdk.jndi.object.factoriesFilter", "!com.zaxxer.hikari.HikariJNDIFactory");
        // for CI
        //InitialContext initialContext = new InitialContext();
        //initialContext.lookup("rmi://localhost:1099/Exploit");
    }

}
