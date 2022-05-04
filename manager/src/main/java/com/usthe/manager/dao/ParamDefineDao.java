package com.usthe.manager.dao;

import com.usthe.common.entity.manager.ParamDefine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Param Define Database Operations
 * ParamDefine数据库操作
 *
 * @author tomsun28
 * @date 2021/11/14 11:27
 */
public interface ParamDefineDao extends JpaRepository<ParamDefine, Long> {

    /**
     * Query the parameter definitions under it according to the monitoring type
     * 根据监控类型查询其下的参数定义
     *
     * @param app Monitoring type       监控类型
     * @return parameter definition list        参数定义列表
     */
    List<ParamDefine> findParamDefinesByApp(String app);
}
