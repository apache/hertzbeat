package com.usthe.manager.dao;

import com.usthe.manager.pojo.entity.ParamDefine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * ParamDefine数据库操作
 *
 *
 */
public interface ParamDefineDao extends JpaRepository<ParamDefine, Long> {

    /**
     * 根据监控类型查询其下的参数定义
     * @param app 监控类型
     * @return 参数定义列表
     */
    List<ParamDefine> findParamDefinesByApp(String app);
}
