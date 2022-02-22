package com.usthe.alert.dao;

import com.usthe.common.entity.manager.Monitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/**
 * Alert Monitor 数据库操作
 * @author tomsun28
 * @date 2021/11/14 11:24
 */
public interface AlertMonitorDao extends JpaRepository<Monitor, Long>, JpaSpecificationExecutor<Monitor> {

    /**
     * 查询指定监控状态的监控
     * @param status 监控状态
     * @return 监控列表
     */
    List<Monitor> findMonitorsByStatusIn(List<Byte> status);

}
