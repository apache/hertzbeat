package com.usthe.manager.service.impl;

import com.usthe.manager.pojo.entity.ParamDefine;
import com.usthe.manager.service.AppService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 监控类型管理实现
 * @author tomsun28
 * @date 2021/11/14 17:17
 */
@Service
public class AppServiceImpl implements AppService {

    @Override
    public List<ParamDefine> getAppParamDefines(String app) {

        return null;
    }
}
