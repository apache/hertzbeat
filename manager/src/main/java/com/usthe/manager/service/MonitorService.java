package com.usthe.manager.service;

import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.pojo.entity.Monitor;
import com.usthe.manager.pojo.entity.Param;
import com.usthe.manager.support.exception.MonitorDetectException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Set;

/**
 * 监控管理服务
 *
 *
 */
public interface MonitorService {


    /**
     * 监控可用性探测
     * @param monitor 监控实体信息
     * @param params 参数信息
     * @throws MonitorDetectException 探测失败抛出
     */
    void detectMonitor(Monitor monitor, List<Param> params) throws MonitorDetectException;

    /**
     * 新增监控
     * @param monitor 监控实体
     * @param params 参数信息
     * @throws RuntimeException 新增过程异常抛出
     */
    void addMonitor(Monitor monitor, List<Param> params) throws RuntimeException;

    /**
     * 校验请求数据参数正确性
     * @param monitorDto monitorDto
     * @param isModify 是否是修改监控
     * @throws IllegalArgumentException 校验参数错误抛出
     */
    void validate(MonitorDto monitorDto, boolean isModify) throws IllegalArgumentException;

    /**
     * 修改更新监控
     * @param monitor 监控实体
     * @param params 参数信息
     * @throws RuntimeException 修改过程中异常抛出
     */
    void modifyMonitor(Monitor monitor, List<Param> params) throws RuntimeException;

    /**
     * 删除监控
     * @param id 监控ID
     * @throws RuntimeException 删除过程中异常抛出
     */
    void deleteMonitor(long id) throws RuntimeException;

    /**
     * 批量删除监控
     * @param ids 监控ID
     * @throws RuntimeException 删除过程中异常抛出
     */
    void deleteMonitors(Set<Long> ids) throws RuntimeException;

    /**
     * 获取监控信息
     * @param id 监控ID
     * @return MonitorDto
     * @throws RuntimeException 查询过程中异常抛出
     */
    MonitorDto getMonitor(long id) throws RuntimeException;

    /**
     * 动态条件查询
     * @param specification 查询条件
     * @param pageRequest 分页参数
     * @return 查询结果
     */
    Page<Monitor> getMonitors(Specification<Monitor> specification, PageRequest pageRequest);
}
