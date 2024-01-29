package org.dromara.hertzbeat.grafana.dao;

import org.dromara.hertzbeat.common.entity.grafana.ServiceAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
/**
 * ServiceAccount Dao
 */
public interface ServiceAccountDao extends JpaRepository<ServiceAccount, Long>, JpaSpecificationExecutor<ServiceAccount> {
        ServiceAccount findByName(String name);
}
