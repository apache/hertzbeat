package com.usthe.alert.dao;

import com.usthe.common.entity.alerter.AlertDefineBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/**
 * AlertDefineBind 数据库操作
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDefineBindDao extends JpaRepository<AlertDefineBind, Long>, JpaSpecificationExecutor<AlertDefineBind> {

    /**
     * 根据告警定义ID删除告警定义与监控关联
     * @param alertDefineId 告警定义ID
     */
    void deleteAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);

    /**
     * 根据告警定义ID查询监控关联信息
     * @param alertDefineId 告警定义ID
     * @return 关联监控信息
     */
    List<AlertDefineBind> getAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);
}
