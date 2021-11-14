package com.usthe.manager.dao;

import org.springframework.data.jpa.repository.JpaRepository;
import sun.security.util.AuthResources;

/**
 * AuthResources 数据库操作
 *
 *
 */
public interface MonitorDao extends JpaRepository<AuthResources, Long> {


}
