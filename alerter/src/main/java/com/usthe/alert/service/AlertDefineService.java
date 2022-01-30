package com.usthe.alert.service;

import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 告警定义管理接口
 * @author tom
 * @date 2021/12/9 10:06
 */
public interface AlertDefineService {

    /**
     * 校验请求数据参数正确性
     * @param alertDefine alertDefine
     * @param isModify 是否是修改配置
     * @throws IllegalArgumentException 校验参数错误抛出
     */
    void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException;

    /**
     * 新增告警定义
     * @param alertDefine 告警定义实体
     * @throws RuntimeException 新增过程异常抛出
     */
    void addAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * 修改告警定义
     * @param alertDefine 告警定义实体
     * @throws RuntimeException 修改过程中异常抛出
     */
    void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException;

    /**
     * 删除告警定义
     * @param alertId 告警定义ID
     * @throws RuntimeException 删除过程中异常抛出
     */
    void deleteAlertDefine(long alertId) throws RuntimeException;

    /**
     * 获取告警定义信息
     * @param alertId 监控ID
     * @return AlertDefine
     * @throws RuntimeException 查询过程中异常抛出
     */
    AlertDefine getAlertDefine(long alertId) throws RuntimeException;


    /**
     * 批量删除告警定义
     * @param alertIds 告警定义IDs
     * @throws RuntimeException 删除过程中异常抛出
     */
    void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException;

    /**
     * 动态条件查询
     * @param specification 查询条件
     * @param pageRequest 分页参数
     * @return 查询结果
     */
    Page<AlertDefine> getMonitorBindAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * 应用告警定于与监控关联关系
     * @param alertId 告警定义ID
     * @param alertDefineBinds 关联关系
     */
    void applyBindAlertDefineMonitors(Long alertId, List<AlertDefineMonitorBind> alertDefineBinds);

    /**
     * 查询与此监控ID关联的指定指标组匹配的告警定义
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标组
     * @return field - define[]
     */
    Map<String, List<AlertDefine>> getMonitorBindAlertDefines(long monitorId, String app, String metrics);

    /**
     * 动态条件查询
     * @param specification 查询条件
     * @param pageRequest 分页参数
     * @return 查询结果
     */
    Page<AlertDefine> getAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * 根据告警定义ID查询其关联的监控列表关联信息
     * @param alertDefineId 告警定义ID
     * @return 监控列表关联信息
     */
    List<AlertDefineMonitorBind> getBindAlertDefineMonitors(long alertDefineId);
}
