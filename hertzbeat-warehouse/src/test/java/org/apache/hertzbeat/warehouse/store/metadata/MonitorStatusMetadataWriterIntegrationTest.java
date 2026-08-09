/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.warehouse.store.metadata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import jakarta.persistence.EntityManagerFactory;
import java.time.Duration;
import javax.sql.DataSource;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionConfiguration;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionCoordinator;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.common.transaction.MetadataWriteMaintenanceLease;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = MonitorStatusMetadataWriterIntegrationTest.TestConfiguration.class)
class MonitorStatusMetadataWriterIntegrationTest {

    @Autowired
    private MonitorStatusMetadataWriter writer;

    @Autowired
    private MetadataWriteAdmissionCoordinator coordinator;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @BeforeEach
    void seedMonitor() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hzb_monitor (id BIGINT PRIMARY KEY, status TINYINT)");
        jdbcTemplate.update("DELETE FROM hzb_monitor");
        jdbcTemplate.update("INSERT INTO hzb_monitor (id, status) VALUES (?, ?)",
                42L, CommonConstants.MONITOR_PENDING_CODE);
        clearInvocations(entityManagerFactory.getCache());
    }

    @Test
    void typedWriterPreservesPausedCurrentAndCacheEvictionSemantics() {
        writer.updateAvailability(42L, MonitorAvailability.UP);
        assertThat(status()).isEqualTo(CommonConstants.MONITOR_UP_CODE);
        verify(entityManagerFactory.getCache()).evict(Monitor.class, 42L);

        writer.updateAvailability(42L, MonitorAvailability.UP);
        jdbcTemplate.update("UPDATE hzb_monitor SET status = ? WHERE id = ?",
                CommonConstants.MONITOR_PAUSED_CODE, 42L);
        writer.updateAvailability(42L, MonitorAvailability.DOWN);

        assertThat(status()).isEqualTo(CommonConstants.MONITOR_PAUSED_CODE);
        verifyNoMoreInteractions(entityManagerFactory.getCache());
    }

    @Test
    void maintenanceGateRejectsTypedMetadataWriteAndReleaseRestoresIt() {
        try (MetadataWriteMaintenanceLease ignored = coordinator.acquire(
                "monitor-status-maintenance", Duration.ofSeconds(1))) {
            assertThatThrownBy(() -> writer.updateAvailability(42L, MonitorAvailability.DOWN))
                    .isInstanceOf(MetadataWriteAdmissionException.class);
            assertThat(status()).isEqualTo(CommonConstants.MONITOR_PENDING_CODE);
        }

        writer.updateAvailability(42L, MonitorAvailability.DOWN);
        assertThat(status()).isEqualTo(CommonConstants.MONITOR_DOWN_CODE);
    }

    private byte status() {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM hzb_monitor WHERE id = ?", Byte.class, 42L);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement(order = 200)
    @Import({MetadataWriteAdmissionConfiguration.class, JdbcMonitorStatusMetadataWriter.class})
    static class TestConfiguration {

        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:monitor-status;DB_CLOSE_DELAY=-1", "sa", "");
        }

        @Bean
        JdbcTemplate jdbcTemplate(DataSource dataSource) {
            return new JdbcTemplate(dataSource);
        }

        @Bean
        PlatformTransactionManager transactionManager(DataSource dataSource) {
            return new DataSourceTransactionManager(dataSource);
        }

        @Bean
        EntityManagerFactory entityManagerFactory() {
            return mock(EntityManagerFactory.class, RETURNS_DEEP_STUBS);
        }
    }
}
