package com.usthe.collector.collect.strategy;

import com.usthe.collector.collect.AbstractCollect;
import org.springframework.util.StringUtils;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 数据收集策略工厂
 * @author myth
 * @date 2022/7/20 16:19
 */
public class CollectStrategyFactory {
    /**
     * 策略容器
     */
    private static ConcurrentHashMap<String, AbstractCollect> strategy = new ConcurrentHashMap<>();

    /**
     * 获取注册的收集实现类
     *
     * @param name
     * @return
     */
    public static AbstractCollect invoke(String name) {
        AbstractCollect abstractCollect = strategy.get(name);
        return abstractCollect;

    }

    /**
     * 注册的收集实现类
     *
     * @param name
     * @param abstractCollect
     */
    public static void register(String name, AbstractCollect abstractCollect) {
        if (StringUtils.isEmpty(name) || abstractCollect == null) {
            return;
        }
        strategy.put(name, abstractCollect);
    }

}
