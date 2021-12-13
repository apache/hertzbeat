package com.usthe.alert.dao;

import com.usthe.alert.pojo.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Set;

/**
 * Alert 数据库操作
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDao extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    /**
     * 根据ID列表删除告警
     * @param alertIds 告警ID列表
     */
    void deleteAlertsByIdIn(Set<Long> alertIds);

}
