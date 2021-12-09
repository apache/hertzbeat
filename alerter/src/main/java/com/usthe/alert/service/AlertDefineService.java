package com.usthe.alert.service;

import com.usthe.alert.pojo.entity.AlertDefine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.Map;
import java.util.Set;

/**
 * 告警定义管理接口
 *
 *
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
    Page<AlertDefine> getAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest);

    /**
     * 应用告警定于与监控关联关系
     * @param alertId 告警定义ID
     * @param monitorMap 监控ID-名称 MAP
     */
    void applyBindAlertDefineMonitors(Long alertId, Map<Long, String> monitorMap);
}
