package com.usthe.warehouse.dao;


import com.usthe.common.entity.warehouse.History;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * history entity dao
 *
 *
 */
public interface HistoryDao extends JpaRepository<History, Long>, JpaSpecificationExecutor<History> {

}
