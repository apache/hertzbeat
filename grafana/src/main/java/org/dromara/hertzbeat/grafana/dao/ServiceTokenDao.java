package org.dromara.hertzbeat.grafana.dao;

import org.dromara.hertzbeat.common.entity.grafana.ServiceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * ServiceAccount Dao
 */
public interface ServiceTokenDao extends JpaRepository<ServiceToken, Long>, JpaSpecificationExecutor<ServiceToken> {
        ServiceToken findByName(String name);
}
