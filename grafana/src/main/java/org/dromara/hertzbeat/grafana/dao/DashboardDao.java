package org.dromara.hertzbeat.grafana.dao;

import org.dromara.hertzbeat.common.entity.grafana.Dashboard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Dashboard Dao
 */
public interface DashboardDao extends JpaRepository<Dashboard, Long>, JpaSpecificationExecutor<Dashboard> {
    /**
     * find by monitor id
     * @param monitorId monitor id
     * @return dashboard
     */
    Dashboard findByMonitorId(Long monitorId);
    /**
     * delete by monitor id
     * @param monitorId monitor id
     */
    void deleteByMonitorId(Long monitorId);
}
