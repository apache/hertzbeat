package com.usthe.manager.service;

import com.usthe.manager.pojo.dto.AppCount;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import com.usthe.manager.support.exception.MonitorDetectException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 监控管理服务
 *
 * @author tomsun28
 * @date 2021/11/14 11:28
 */
public interface MonitorService {


    /**
     * Monitoring Availability Probes
     * 监控可用性探测
     *
     * @param monitor Monitoring entity information    监控实体信息
     * @param params  Parameter information            参数信息
     * @throws MonitorDetectException Probe failure throws  探测失败抛出
     */
    void detectMonitor(Monitor monitor, List<Param> params) throws MonitorDetectException;

    /**
     * Add monitoring       新增监控
     *
     * @param monitor Monitoring Entity     监控实体
     * @param params  Parameter information 参数信息
     * @throws RuntimeException Add process exception throw     新增过程异常抛出
     */
    void addMonitor(Monitor monitor, List<Param> params) throws RuntimeException;

    /**
     * Verify the correctness of request data parameters
     * 校验请求数据参数正确性
     *
     * @param monitorDto monitorDto
     * @param isModify   Whether it is a modification monitoring    是否是修改监控
     * @throws IllegalArgumentException Validation parameter error thrown   校验参数错误抛出
     */
    void validate(MonitorDto monitorDto, Boolean isModify) throws IllegalArgumentException;

    /**
     * Modify update monitoring
     * 修改更新监控
     *
     * @param monitor Monitor Entity        监控实体
     * @param params  Parameter information 参数信息
     * @throws RuntimeException Exception thrown during modification    修改过程中异常抛出
     */
    void modifyMonitor(Monitor monitor, List<Param> params) throws RuntimeException;

    /**
     * Delete Monitor
     * 删除监控
     *
     * @param id Monitor ID         监控ID
     * @throws RuntimeException Exception thrown during deletion    删除过程中异常抛出
     */
    void deleteMonitor(long id) throws RuntimeException;

    /**
     * Batch delete monitoring
     * 批量删除监控
     *
     * @param ids Monitoring ID List    监控ID列表
     * @throws RuntimeException Exception thrown during deletion    删除过程中异常抛出
     */
    void deleteMonitors(Set<Long> ids) throws RuntimeException;

    /**
     * Get monitoring information
     * 获取监控信息
     *
     * @param id Monitor ID      监控ID
     * @return MonitorDto   Monitor Entity  監控实体
     * @throws RuntimeException Exception thrown during query   查询过程中异常抛出
     */
    MonitorDto getMonitorDto(long id) throws RuntimeException;

    /**
     * Dynamic conditional query
     * 动态条件查询
     *
     * @param specification Query conditions        查询条件
     * @param pageRequest   Pagination parameters   分页参数
     * @return Search Result          查询结果
     */
    Page<Monitor> getMonitors(Specification<Monitor> specification, PageRequest pageRequest);

    /**
     * Unmanaged monitoring items in batches according to the monitoring ID list
     * 根据监控ID列表批量取消纳管监控项
     *
     * @param ids Monitoring ID List    监控ID列表
     */
    void cancelManageMonitors(HashSet<Long> ids);

    /**
     * Start the managed monitoring items in batches according to the monitoring ID list
     * 根据监控ID列表批量启动纳管监控项
     *
     * @param ids Monitoring ID List    监控ID列表
     */
    void enableManageMonitors(HashSet<Long> ids);

    /**
     * Query the monitoring category and its corresponding monitoring quantity
     * 查询监控类别及其对应的监控数量
     *
     * @return Monitoring Category and Monitoring Quantity Mapping  监控类别与监控数量映射
     */
    List<AppCount> getAllAppMonitorsCount();

    /**
     * Query monitoring
     * 查询监控
     *
     * @param monitorId Monitor ID  监控ID
     * @return Monitor information  监控信息
     */
    Monitor getMonitor(Long monitorId);

    /**
     * Update the status of the specified monitor
     * 更新指定监控的状态
     *
     * @param monitorId monitorId    监控ID
     * @param status    monitor status  监控状态
     */
    void updateMonitorStatus(Long monitorId, byte status);

    /**
     * Query the list of all monitoring information under the specified monitoring type
     * 查询指定监控类型下的所有监控信息列表
     *
     * @param app Monitor Type      监控类型
     * @return Monitor Entity List  监控列表
     */
    List<Monitor> getAppMonitors(String app);
}
