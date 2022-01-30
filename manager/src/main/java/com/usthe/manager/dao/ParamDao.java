package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

/**
 * ParamDao 数据库操作
 * @author tomsun28
 * @date 2021/11/14 11:26
 */
public interface ParamDao extends JpaRepository<Param, Long> {

    /**
     * 根据监控ID查询与之关联的参数列表
     * @param monitorId 监控ID
     * @return 参数值列表
     */
    List<Param> findParamsByMonitorId(long monitorId);

    /**
     * 根据监控ID删除与之关联的参数列表
     * @param monitorId 监控ID
     */
    void deleteParamsByMonitorId(long monitorId);

    /**
     * 根据监控ID列表删除与之关联的参数列表
     * @param monitorIds 监控ID列表
     */
    void deleteParamsByMonitorIdIn(Set<Long> monitorIds);
}
