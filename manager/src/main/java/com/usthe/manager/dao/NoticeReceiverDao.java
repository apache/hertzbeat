package com.usthe.manager.dao;

import com.usthe.common.entity.manager.NoticeReceiver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * NoticeReceiver数据库操作
 *
 *
 */
public interface NoticeReceiverDao extends JpaRepository<NoticeReceiver, Long>, JpaSpecificationExecutor<NoticeReceiver> {

}
