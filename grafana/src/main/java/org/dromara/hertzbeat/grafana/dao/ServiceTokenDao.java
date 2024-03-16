package org.dromara.hertzbeat.grafana.dao;

import org.dromara.hertzbeat.common.entity.grafana.ServiceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

/**
 * ServiceAccount Dao
 */
public interface ServiceTokenDao extends JpaRepository<ServiceToken, Long>, JpaSpecificationExecutor<ServiceToken> {
    ServiceToken findByName(String name);

    @Transactional
    @Modifying
    @Query(value = "truncate table grafana_service_token", nativeQuery = true)
    void truncate();
}
