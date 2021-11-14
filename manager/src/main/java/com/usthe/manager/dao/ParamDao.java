package com.usthe.manager.dao;

import com.usthe.manager.pojo.entity.Param;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ParamDao 数据库操作
 *
 *
 */
public interface ParamDao extends JpaRepository<Param, Long> {
}
