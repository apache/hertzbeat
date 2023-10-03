package org.dromara.hertzbeat.push.dao;

import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * push monitor dao
 *
 *
 */
public interface PushMonitorDao extends JpaRepository<Monitor, Long> {
}
