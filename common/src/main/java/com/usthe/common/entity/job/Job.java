package com.usthe.common.entity.job;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.GsonUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 采集任务详情
 * @author tomsun28
 * @date 2021/10/17 21:19
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Slf4j
public class Job {

    private static final String AVAILABILITY = "availability";

    /**
     * 任务ID
     */
    private long id;
    /**
     * 监控ID 应用ID
     */
    private long monitorId;
    /**
     * 监控的大类别
     * service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控
     */
    private String category;
    /**
     * 监控的类型 eg: linux | mysql | jvm
     */
    private String app;
    /**
     * 监控类型的国际化名称
     * zh-CN: PING连通性
     * en-US: PING CONNECT
     */
    private Map<String, String> name;
    /**
     * 任务派发开始时间戳
     */
    private long timestamp;
    /**
     * 任务采集时间间隔(单位秒) eg: 30,60,600
     */
    private long interval = 600L;
    /**
     * 是否是循环周期性任务 true为是,false为否
     */
    private boolean isCyclic = false;
    /**
     * 指标组配置 eg: cpu memory
     */
    private List<Metrics> metrics;
    /**
     * 监控配置参数属性及值 eg: username password timeout host
     */
    private List<Configmap> configmap;

    /**
     * collector使用 - 任务被时间轮开始调度的时间戳
     */
    @JsonIgnore
    private transient long dispatchTime;

    /**
     * collector使用 - 任务版本,此字段不存储于etcd
     */
    @JsonIgnore
    private transient long version;
    /**
     * collector使用 - 指标组任务执行优先级视图
     * 0 - availability
     * 1 - cpu | memory
     * 2 - health
     * 3 - otherMetrics
     * ....
     * 126 - otherMetrics
     * 127 - lastPriorMetrics
     */
    @JsonIgnore
    private transient List<Set<Metrics>> priorMetrics;

    /**
     * collector使用 - 临时存储一次性任务指标组响应数据
     */
    @JsonIgnore
    private transient List<CollectRep.MetricsData> responseDataTemp;

    /**
     * collector使用 - 构造初始化指标组执行视图
     */
    public synchronized void constructPriorMetrics() {
        Map<Byte, List<Metrics>> map = metrics.stream()
                .peek(metric -> {
                    // 判断是否配置aliasFields 没有则配置默认
                    if (metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) {
                        metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
                    }
                    // 设置默认的指标组执行优先级,不填则默认最后优先级
                    if (metric.getPriority() == null) {
                        metric.setPriority(Byte.MAX_VALUE);
                    }
                })
                .collect(Collectors.groupingBy(Metrics::getPriority));
        // 构造指标组任务执行顺序链表
        priorMetrics = new LinkedList<>();
        map.values().forEach(metric -> {
            Set<Metrics> metricsSet = new HashSet<>(metric);
            priorMetrics.add(metricsSet);
        });
        priorMetrics.sort(Comparator.comparing(e -> {
            Optional<Metrics> metric = e.stream().findAny();
            if (metric.isPresent()) {
                return metric.get().getPriority();
            } else {
                return Byte.MAX_VALUE;
            }
        }));
    }

    /**
     * collector使用 - 获取下一组优先级的指标组任务
     * @param metrics 当前指标组
     * @param first 是否是第一次获取
     * @return 指标组任务
     * 返回null表示：job已完成,所有指标组采集结束
     * 返回empty的集合表示：当前级别下还有指标组采集任务未结束,无法进行下一级别的指标组任务采集
     * 返回有数据集合表示：获取到下一组优先级的指标组任务
     */
    public synchronized Set<Metrics> getNextCollectMetrics(Metrics metrics, boolean first) {
        if (priorMetrics == null || priorMetrics.isEmpty()) {
            return null;
        }
        Set<Metrics> metricsSet = priorMetrics.get(0);
        if (first) {
            if (metricsSet.isEmpty()) {
                log.error("metrics must has one [availability] metrics at least.");

            }
            return metricsSet;
        }
        if (metrics == null) {
            log.error("metrics can not null when not first get");
            return null;
        }
        if (!metricsSet.remove(metrics)) {
            log.error("Job {} appId {} app {} metrics {} remove empty error in priorMetrics.",
                    id, monitorId, app, metrics.getName());
        }
        if (metricsSet.isEmpty()) {
            priorMetrics.remove(0);
            if (priorMetrics.size() == 0) {
                return null;
            }
            return priorMetrics.get(0);
        } else {
            return Collections.emptySet();
        }
    }

    public void addCollectMetricsData(CollectRep.MetricsData metricsData) {
        if (responseDataTemp == null) {
            responseDataTemp = new LinkedList<>();
        }
        responseDataTemp.add(metricsData);
    }

    @Override
    public Job clone() {
        // 深度克隆
        return GsonUtil.fromJson(GsonUtil.toJson(this), Job.class);
    }
}
