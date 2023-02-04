package com.usthe.manager.dao;

import com.usthe.common.entity.manager.NoticePeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * @author ceilzcx
 * @since 1/2/2023
 */
public interface NoticePeriodDao extends JpaRepository<NoticePeriod, Long>, JpaSpecificationExecutor<NoticePeriod> {

}
