package com.usthe.alert.dao;

import com.usthe.alert.pojo.entity.AlertDefine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Set;

/**
 * AlertDefine 数据库操作
 * @author tom
 * @date 2021/12/9 10:03
 */
public interface AlertDefineDao extends JpaRepository<AlertDefine, Long>, JpaSpecificationExecutor<AlertDefine> {

    /**
     * 根据ID列表删除告警定义
     * @param alertDefineIds 告警定义ID列表
     */
    void deleteAllByIdIn(Set<Long> alertDefineIds);
}
