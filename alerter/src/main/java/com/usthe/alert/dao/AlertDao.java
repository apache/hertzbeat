package com.usthe.alert.dao;

import com.usthe.alert.pojo.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Alert 数据库操作
 *
 *
 */
public interface AlertDao extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

}
