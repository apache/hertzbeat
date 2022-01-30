package com.usthe.manager.dao;

import com.usthe.common.entity.manager.NoticeRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

/**
 * NoticeRule数据库操作
 * @author tom
 * @date 2021/12/16 16:13
 */
public interface NoticeRuleDao extends JpaRepository<NoticeRule, Long>, JpaSpecificationExecutor<NoticeRule> {

    /**
     * 查询所有已启用的通知策略
     * @return 通知策略
     */
    List<NoticeRule> findNoticeRulesByEnableTrue();
}
