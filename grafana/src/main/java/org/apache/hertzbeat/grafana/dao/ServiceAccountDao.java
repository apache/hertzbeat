package org.apache.hertzbeat.grafana.dao;

import org.dromara.hertzbeat.common.entity.grafana.ServiceAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

/**
 * ServiceAccount Dao
 */
public interface ServiceAccountDao extends JpaRepository<ServiceAccount, Long>, JpaSpecificationExecutor<ServiceAccount> {

    ServiceAccount findByName(String name);

    @Transactional
    @Modifying
    @Query(value = "truncate table grafana_service_account", nativeQuery = true)
    void truncate();
}
