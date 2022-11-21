package com.usthe.collector.collect.strategy;

import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.dispatch.DispatchConstants;
import org.springframework.util.StringUtils;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 数据收集策略工厂
 * @author ：myth
 * @date ：Created 2022/7/20 16:19
 */
public class ParseStrategyFactory {
    /**
     * 策略容器
     */
    private static ConcurrentHashMap<String, AbstractParseResponse> strategy = new ConcurrentHashMap<>();

    /**
     * 获取注册的收集实现类
     *
     * @param name
     * @return
     */
    public static AbstractParseResponse invoke(String name) {
        AbstractParseResponse abstractCollect = strategy.get(name);
        if (abstractCollect == null) strategy.get(DispatchConstants.PARSE_DEFAULT);
        return abstractCollect;

    }

    /**
     * 注册的收集实现类
     *
     * @param name
     * @param abstractParseResponse
     */
    public static void register(String name, AbstractParseResponse abstractParseResponse) {
        if (StringUtils.isEmpty(name) || abstractParseResponse == null) {
            return;
        }
        strategy.put(name, abstractParseResponse);
    }

}
