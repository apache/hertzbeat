package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

/**
 * ParamDao 数据库操作
 *
 * @author tomsun28
 * @date 2021/11/14 11:26
 */
public interface ParamDao extends JpaRepository<Param, Long> {

    /**
     * Query the list of parameters associated with the monitoring ID'
     * 根据监控ID查询与之关联的参数列表
     *
     * @param monitorId Monitor ID          监控ID
     * @return list of parameter values     参数值列表
     */
    List<Param> findParamsByMonitorId(long monitorId);

    /**
     * Remove the parameter list associated with the monitoring ID based on it
     * 根据监控ID删除与之关联的参数列表
     *
     * @param monitorId Monitor Id       监控ID
     */
    void deleteParamsByMonitorId(long monitorId);

    /**
     * Remove the parameter list associated with the monitoring ID list based on it
     * 根据监控ID列表删除与之关联的参数列表
     *
     * @param monitorIds Monitoring ID List     监控ID列表
     */
    void deleteParamsByMonitorIdIn(Set<Long> monitorIds);
}
