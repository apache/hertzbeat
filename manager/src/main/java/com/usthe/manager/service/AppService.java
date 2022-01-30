package com.usthe.manager.service;

import com.usthe.common.entity.job.Job;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.common.entity.manager.ParamDefine;

import java.util.List;
import java.util.Map;

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

    /**
     * 根据监控类型名称获取监控结构定义
     * @param app 监控类型名称
     * @return 监控结构定义
     * @throws IllegalArgumentException 当不存在即不支持对应名称的监控类型时抛出
     */
    Job getAppDefine(String app) throws IllegalArgumentException;

    /**
     * 获取定义的监控I18N资源
     * @param lang 语言类型
     * @return I18N资源
     */
    Map<String, String> getI18nResources(String lang);

    /**
     * 查询所有监控的类型-指标组-指标层级
     * @param lang 语言
     * @return 层级信息
     */
    List<Hierarchy> getAllAppHierarchy(String lang);

}
