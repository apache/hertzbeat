package com.usthe.alert.dao;

import com.usthe.common.entity.alerter.AlertDefine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

/**
 * AlertDefine 数据库操作
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDefineDao extends JpaRepository<AlertDefine, Long>, JpaSpecificationExecutor<AlertDefine> {

    /**
     * 根据ID列表删除告警定义
     * @param alertDefineIds 告警定义ID列表
     */
    void deleteAlertDefinesByIdIn(Set<Long> alertDefineIds);

    /**
     * 根据监控ID查询与之关联的告警定义列表
     * @param monitorId 监控ID
     * @param metrics 指标组
     * @return 告警定义列表
     */
    @Query("select define from AlertDefine define join AlertDefineMonitorBind bind on bind.alertDefineId = define.id " +
            "where bind.monitorId = :monitorId and define.metric = :metrics and define.enable = true")
    List<AlertDefine> queryAlertDefinesByMonitor(@Param(value = "monitorId") Long monitorId,
                                                 @Param(value = "metrics") String metrics);
}
