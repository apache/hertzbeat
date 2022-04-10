package com.usthe.alert.dao;

import com.usthe.alert.dto.AlertPriorityNum;
import com.usthe.common.entity.alerter.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

/**
 * Alert Database Operations Alert数据库表操作
 *
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDao extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    /**
     * Delete alerts based on ID list 根据ID列表删除告警
     *
     * @param alertIds Alert ID List  告警ID列表
     */
    void deleteAlertsByIdIn(Set<Long> alertIds);

    /**
     * 根据告警ID-状态值 更新告警状态
     *
     * @param status 状态值
     * @param ids    告警ID列表
     */
    @Modifying
    @Query("update Alert set status = :status where id in :ids")
    void updateAlertsStatus(@Param(value = "status") Byte status, @Param(value = "ids") List<Long> ids);

    /**
     * Query the number of unhandled alarms of each alarm severity
     * 查询各个告警级别的未处理告警数量
     *
     * @return Number of alerts 告警数量
     */
    @Query("select new com.usthe.alert.dto.AlertPriorityNum(mo.priority, count(mo.id)) from Alert mo where mo.status = 0 group by mo.priority")
    List<AlertPriorityNum> findAlertPriorityNum();
}
