package com.usthe.warehouse.dao;


import com.usthe.common.entity.warehouse.History;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * history entity dao
 * @author tom
 * @date 2023/2/3 15:01
 */
public interface HistoryDao extends JpaRepository<History, Long>, JpaSpecificationExecutor<History> {

    /**
     * delete history before expireTime
     * @param expireTime expireTime
     */
    void deleteHistoriesByTimeBefore(Long expireTime);
}
