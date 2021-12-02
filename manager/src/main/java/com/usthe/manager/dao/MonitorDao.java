package com.usthe.manager.dao;

import com.usthe.manager.pojo.entity.Monitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Set;

/**
 * AuthResources 数据库操作
 *
 *
 */
public interface MonitorDao extends JpaRepository<Monitor, Long>, JpaSpecificationExecutor<Monitor> {


    /**
     * 根据监控ID列表删除监控
     * @param monitorIds 监控ID列表
     */
    void deleteAllByIdIn(Set<Long> monitorIds);

    /**
 * 根据监控ID列表查询监控
     * @param monitorIds 监控ID列表
     * @return 监控列表
     */
    List<Monitor> findMonitorsByIdIn(Set<Long> monitorIds);

}
