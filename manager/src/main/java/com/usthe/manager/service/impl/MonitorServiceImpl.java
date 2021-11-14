package com.usthe.manager.service.impl;

import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.pojo.entity.Monitor;
import com.usthe.manager.pojo.entity.Param;
import com.usthe.manager.service.MonitorService;
import com.usthe.manager.support.exception.MonitorDetectException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 监控管理服务实现
 * @author tomsun28
 * @date 2021/11/14 13:06
 */
@Service
public class MonitorServiceImpl implements MonitorService {


    @Override
    public void detectMonitor(Monitor monitor, List<Param> params) throws MonitorDetectException {

    }

    @Override
    public void addMonitor(Monitor monitor, List<Param> params) throws RuntimeException {

    }

    @Override
    public void validate(MonitorDto monitorDto, boolean isModify) throws IllegalArgumentException {

    }

    @Override
    public void modifyMonitor(Monitor monitor, List<Param> params) throws RuntimeException {

    }

    @Override
    public void deleteMonitor(long id) throws RuntimeException {

    }

    @Override
    public MonitorDto getMonitor(long id) throws RuntimeException {
        return null;
    }
}
