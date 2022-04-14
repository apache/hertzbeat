package com.usthe.alert.dao;

import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/**
 * AlertDefineBind database operations  数据库操作
 *
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDefineBindDao extends JpaRepository<AlertDefineMonitorBind, Long>, JpaSpecificationExecutor<AlertDefineMonitorBind> {

    /**
     * Delete the alarm definition and monitor association based on the alarm definition ID
     * 根据告警定义ID删除告警定义与监控关联
     *
     * @param alertDefineId Alarm Definition ID     告警定义ID
     */
    void deleteAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);

    /**
     * Deleting alarms based on monitoring IDs defines monitoring associations
     * 根据监控ID删除告警定义监控关联
     *
     * @param monitorId Monitor Id   监控ID
     */
    void deleteAlertDefineMonitorBindsByMonitorIdEquals(Long monitorId);

    /**
     * Delete alarm definition monitoring association based on monitoring ID list
     * 根据监控ID列表删除告警定义监控关联
     *
     * @param monitorIds Monitoring ID List     监控ID列表
     */
    void deleteAlertDefineMonitorBindsByMonitorIdIn(List<Long> monitorIds);

    /**
     * Query monitoring related information based on alarm definition ID
     * 根据告警定义ID查询监控关联信息
     *
     * @param alertDefineId Alarm Definition ID     告警定义ID
     * @return Associated monitoring information    关联监控信息
     */
    List<AlertDefineMonitorBind> getAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);
}
