package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.common.entity.manager.MetricsCollection;
import org.jetbrains.annotations.NotNull;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Historical Collection Dao
 * @author zqr10159
 */
public interface MetricsCollectionDao extends JpaRepository<MetricsCollection, Long> {
    /**
     * Get all favorite historical metrics
     * 获取所有被收藏的历史指标
     * @param monitorId monitorId
     * @return historical metrics
     */
    List<MetricsCollection> findByMonitorId(Long monitorId);

    /**
     * Delete favorite historical metrics by id
     * 根据id删除被收藏的历史指标
     * @param id id
     */
    void deleteById(@NotNull Long id);

}
