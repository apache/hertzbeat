/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.warehouse.store.metadata;

import jakarta.persistence.EntityManagerFactory;
import java.util.Objects;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Transactional JDBC adapter for the monitor-status metadata port. */
@Component
public class JdbcMonitorStatusMetadataWriter implements MonitorStatusMetadataWriter {

    private static final String UPDATE_STATUS =
            "UPDATE hzb_monitor SET status = ? WHERE id = ? AND status <> ? AND status <> ?";

    private final JdbcTemplate jdbcTemplate;
    private final EntityManagerFactory entityManagerFactory;

    public JdbcMonitorStatusMetadataWriter(JdbcTemplate jdbcTemplate, EntityManagerFactory entityManagerFactory) {
        this.jdbcTemplate = jdbcTemplate;
        this.entityManagerFactory = entityManagerFactory;
    }

    @Override
    @Transactional
    public void updateAvailability(long monitorId, MonitorAvailability availability) {
        Objects.requireNonNull(availability, "availability");
        byte status = switch (availability) {
            case UP -> CommonConstants.MONITOR_UP_CODE;
            case DOWN -> CommonConstants.MONITOR_DOWN_CODE;
        };
        int matchedRows = jdbcTemplate.update(UPDATE_STATUS, status, monitorId,
                CommonConstants.MONITOR_PAUSED_CODE, status);
        if (matchedRows > 0) {
            entityManagerFactory.getCache().evict(Monitor.class, monitorId);
        }
    }
}
