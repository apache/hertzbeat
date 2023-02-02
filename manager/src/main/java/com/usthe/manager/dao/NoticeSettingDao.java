package com.usthe.manager.dao;

import com.usthe.common.entity.manager.NoticeSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * @author ceilzcx
 * @since 1/2/2023
 */
public interface NoticeSettingDao extends JpaRepository<NoticeSetting, Long>, JpaSpecificationExecutor<NoticeSetting> {

}
