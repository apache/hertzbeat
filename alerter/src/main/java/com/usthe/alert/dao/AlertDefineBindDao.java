package com.usthe.alert.dao;

import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/**
 * AlertDefineBind 数据库操作
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDefineBindDao extends JpaRepository<AlertDefineMonitorBind, Long>, JpaSpecificationExecutor<AlertDefineMonitorBind> {

    /**
     * 根据告警定义ID删除告警定义与监控关联
     * @param alertDefineId 告警定义ID
     */
    void deleteAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);

    /**
     * 根据监控ID删除告警定义监控关联
     * @param monitorId 监控ID
     */
    void deleteAlertDefineMonitorBindsByMonitorIdEquals(Long monitorId);

    /**
     * 根据监控ID列表删除告警定义监控关联
     * @param monitorIds 监控ID列表
     */
    void deleteAlertDefineMonitorBindsByMonitorIdIn(List<Long> monitorIds);

    /**
     * 根据告警定义ID查询监控关联信息
     * @param alertDefineId 告警定义ID
     * @return 关联监控信息
     */
    List<AlertDefineMonitorBind> getAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);
}
