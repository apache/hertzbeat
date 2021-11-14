package com.usthe.manager.service;

import com.usthe.manager.pojo.entity.ParamDefine;

import java.util.List;

/**
 * 监控类型管理接口
 * @author tomsun28
 * @date 2021/11/14 17:12
 */
public interface AppService {

    /**
     * 根据监控类型查询定义的参数结构
     * @param app 监控类型
     * @return 参数结构列表
     */
    List<ParamDefine> getAppParamDefines(String app);
}
