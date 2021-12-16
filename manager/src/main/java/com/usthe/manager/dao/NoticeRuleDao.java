package com.usthe.manager.dao;

import com.usthe.manager.pojo.entity.NoticeRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * NoticeRule数据库操作
 *
 *
 */
public interface NoticeRuleDao extends JpaRepository<NoticeRule, Long>, JpaSpecificationExecutor<NoticeRule> {

}
