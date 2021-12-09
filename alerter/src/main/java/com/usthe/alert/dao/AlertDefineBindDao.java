package com.usthe.alert.dao;

import com.usthe.alert.pojo.entity.AlertDefineBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * AlertDefineBind 数据库操作
 *
 *
 */
public interface AlertDefineBindDao extends JpaRepository<AlertDefineBind, Long>, JpaSpecificationExecutor<AlertDefineBind> {

    /**
     * 根据告警定义ID删除告警定义与监控关联
     * @param alertDefineId 告警定义ID
     */
    void deleteAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);
}
