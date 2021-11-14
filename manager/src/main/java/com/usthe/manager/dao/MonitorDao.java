package com.usthe.manager.dao;

import com.usthe.manager.pojo.entity.Monitor;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * AuthResources 数据库操作
 *
 *
 */
public interface MonitorDao extends JpaRepository<Monitor, Long> {


}
