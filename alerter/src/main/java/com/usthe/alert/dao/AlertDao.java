package com.usthe.alert.dao;

import com.usthe.common.entity.alerter.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

/**
 * Alert 数据库操作
 *
 *
 */
public interface AlertDao extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    /**
     * 根据ID列表删除告警
     * @param alertIds 告警ID列表
     */
    void deleteAlertsByIdIn(Set<Long> alertIds);

    /**
     * 根据告警ID-状态值 更新告警状态
     * @param status 状态值
     * @param ids 告警ID列表
     */
    @Modifying
    @Query("update Alert set status = :status where id in :ids")
    void updateAlertsStatus(@Param(value = "status") Byte status, @Param(value = "ids") List<Long> ids);

}
