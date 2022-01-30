package com.usthe.manager.dao;

import com.usthe.common.entity.manager.ParamDefine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * ParamDefine数据库操作
 * @author tomsun28
 * @date 2021/11/14 11:27
 */
public interface ParamDefineDao extends JpaRepository<ParamDefine, Long> {

    /**
     * 根据监控类型查询其下的参数定义
     * @param app 监控类型
     * @return 参数定义列表
     */
    List<ParamDefine> findParamDefinesByApp(String app);
}
