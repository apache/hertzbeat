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

package org.apache.hertzbeat.manager.component.status;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Real Hibernate/H2 tests: a mocked repository cannot detect reuse of deleted generated IDs.
 */
class StatusPageHistoryAggregatorTest {

    private AnnotationConfigApplicationContext context;
    private StatusPageHistoryDao historyDao;
    private StatusPageHistoryAggregator aggregator;

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigApplicationContext(Config.class);
        historyDao = context.getBean(StatusPageHistoryDao.class);
        aggregator = context.getBean(StatusPageHistoryAggregator.class);
    }

    @AfterEach
    void tearDown() {
        context.close();
    }

    @Test
    void preservesHistoryAndCountsOnRepeatedAggregation() {
        ZoneId zone = ZoneId.of("UTC");
        LocalDate today = LocalDate.of(2026, 1, 14);
        long start = today.minusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
        long end = today.atStartOfDay(zone).toInstant().toEpochMilli();
        StatusPageHistory retained = save(1, start, (byte) 0);
        save(1, end - 1, (byte) 1);
        StatusPageHistory existingSummary = save(2, start + 1, (byte) 1);
        existingSummary.setNormal(600);
        existingSummary.setAbnormal(900);
        existingSummary.setUnknowing(300);
        historyDao.save(existingSummary);
        save(2, start + 2, (byte) 0);
        save(1, end, (byte) 0);
        save(1, start - 1, (byte) 0);

        aggregator.combinePreviousDay(today, zone, 300);
        assertEquals(4, historyDao.count());
        StatusPageHistory summary = historyDao.findById(retained.getId()).orElseThrow();
        assertEquals(300, summary.getNormal());
        assertEquals(300, summary.getAbnormal());
        assertEquals(0.5, summary.getUptime());
        StatusPageHistory merged = historyDao.findById(existingSummary.getId()).orElseThrow();
        assertEquals(900, merged.getNormal());
        assertEquals(900, merged.getAbnormal());
        assertEquals(300, merged.getUnknowing());
        List<StatusPageHistory> first = historyDao.findAll();
        aggregator.combinePreviousDay(today, zone, 300);
        assertEquals(first, historyDao.findAll());
        // A late-arriving sample is added once, without reducing the existing summary to one interval.
        save(2, start + 3, (byte) 2);
        aggregator.combinePreviousDay(today, zone, 300);
        assertEquals(600, historyDao.findById(existingSummary.getId()).orElseThrow().getUnknowing());
        assertEquals(4, historyDao.count());
    }

    @Test
    void rollsBackAllComponentsWhenCommitFails() {
        ZoneId zone = ZoneId.of("UTC");
        LocalDate today = LocalDate.of(2026, 1, 14);
        long start = today.minusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
        save(1, start, (byte) 1);
        save(1, start + 1, (byte) 0);
        save(2, start, (byte) 0);
        save(2, start + 1, (byte) 0);
        List<StatusPageHistory> original = historyDao.findAll();
        JdbcTemplate jdbc = new JdbcTemplate(context.getBean(DataSource.class));
        jdbc.execute("alter table hzb_status_page_history add constraint test_failure check (normal < 600)");

        assertTrue(AopUtils.isAopProxy(aggregator));
        assertThrows(RuntimeException.class, () -> aggregator.combinePreviousDay(today, zone, 300));
        assertEquals(original, historyDao.findAll());
        jdbc.execute("alter table hzb_status_page_history drop constraint test_failure");
        aggregator.combinePreviousDay(today, zone, 300);
        assertEquals(2, historyDao.count());
    }

    @Test
    void usesLocalDayBoundariesAcrossBothDstTransitions() {
        ZoneId zone = ZoneId.of("America/New_York");
        for (LocalDate today : List.of(LocalDate.of(2026, 3, 9), LocalDate.of(2026, 11, 2))) {
            historyDao.deleteAll();
            long start = today.minusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
            long end = today.atStartOfDay(zone).toInstant().toEpochMilli();
            long expectedHours = today.getMonthValue() == 3 ? 23 : 25;
            assertEquals(expectedHours * 3_600_000, end - start);
            StatusPageHistory before = save(1, start - 1, (byte) 0);
            StatusPageHistory first = save(1, start, (byte) 0);
            save(1, end - 1, (byte) 1);
            StatusPageHistory next = save(1, end, (byte) 0);
            aggregator.combinePreviousDay(today, zone, 300);
            assertEquals(3, historyDao.count());
            assertEquals(300, historyDao.findById(first.getId()).orElseThrow().getAbnormal());
            assertNotNull(historyDao.findById(before.getId()).orElseThrow());
            assertNotNull(historyDao.findById(next.getId()).orElseThrow());
        }
    }

    private StatusPageHistory save(long componentId, long timestamp, byte state) {
        return historyDao.save(StatusPageHistory.builder().componentId(componentId)
                .timestamp(timestamp).state(state).build());
    }

    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = StatusPageHistoryDao.class,
            includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = StatusPageHistoryDao.class))
    static class Config {
        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:status_history_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setManagedTypes(PersistenceManagedTypes.of(StatusPageHistory.class.getName()));
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        StatusPageHistoryAggregator aggregator(StatusPageHistoryDao historyDao) {
            return new StatusPageHistoryAggregator(historyDao);
        }
    }
}
