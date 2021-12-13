package com.usthe.alert.service;

import com.usthe.alert.pojo.entity.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.HashSet;

/**
 * 告警信息管理接口
 *
 *
 */
public interface AlertService {

    /**
     * 新增告警
     * @param alert 告警实体
     * @throws RuntimeException 新增过程异常抛出
     */
    void addAlert(Alert alert) throws RuntimeException;

    /**
     * 动态条件查询
     * @param specification 查询条件
     * @param pageRequest 分页参数
     * @return 查询结果
     */
    Page<Alert> getAlerts(Specification<Alert> specification, PageRequest pageRequest);

    /**
     * 根据告警ID列表批量删除告警
     * @param ids 告警IDs
     */
    void deleteAlerts(HashSet<Long> ids);
}
