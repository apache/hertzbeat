package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.entity.warehouse.History;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.TimePeriodUtil;
import com.usthe.warehouse.config.WarehouseProperties;
import com.usthe.warehouse.dao.HistoryDao;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.math.NumberUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAmount;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * data storage by mysql/h2 - jpa
 *
 * @author tom
 * @since 2023/02/03
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.jpa",
        name = "enabled", havingValue = "true")
@Slf4j
public class HistoryJpaDatabaseDataStorage extends AbstractHistoryDataStorage {
    private HistoryDao historyDao;
    private WarehouseProperties.StoreProperties.JpaProperties jpaProperties;

    private static final int STRING_MAX_LENGTH = 1024;

    public HistoryJpaDatabaseDataStorage(WarehouseProperties properties,
                                         HistoryDao historyDao) {
        this.jpaProperties = properties.getStore().getJpa();
        this.serverAvailable = true;
        this.historyDao = historyDao;
    }

    @Scheduled( fixedDelay = 60, timeUnit = TimeUnit.MINUTES)
    public void expiredDataCleaner() {
        String expireTimeStr = jpaProperties.getExpireTime();
        long expireTime = 0;
        try {
            if (NumberUtils.isParsable(expireTimeStr)) {
                expireTime = NumberUtils.toLong(expireTimeStr);
                expireTime = (ZonedDateTime.now().toEpochSecond() + expireTime) * 1000;
            } else {
                TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(expireTimeStr);
                ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                expireTime = dateTime.toEpochSecond() * 1000;
            }
        } catch (Exception e) {
            log.error("expiredDataCleaner time error: {}. use default expire time to clean: 7d", e.getMessage());
            ZonedDateTime dateTime = ZonedDateTime.now().minus(Duration.ofDays(7));
            expireTime = dateTime.toEpochSecond() * 1000;
        }
        try {
            historyDao.deleteHistoriesByTimeBefore(expireTime);
        } catch (Exception e) {
            log.error("expiredDataCleaner database error: {}.", e.getMessage());
        }
    }

    @Override
    void saveData(CollectRep.MetricsData metricsData) {
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse jpa] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        String monitorType = metricsData.getApp();
        String metrics = metricsData.getMetrics();
        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();
        try {
            List<History> historyList = new LinkedList<>();
            History.HistoryBuilder historyBuilder = History.builder()
                    .monitorId(metricsData.getId())
                    .app(monitorType)
                    .metrics(metrics)
                    .time(metricsData.getTime());
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                String instance = valueRow.getInstance();
                if (!instance.isEmpty()) {
                    instance = formatStrValue(instance);
                    historyBuilder.instance(instance);
                } else {
                    historyBuilder.instance(null);
                }
                for (int i = 0; i < fieldsList.size(); i++) {
                    CollectRep.Field field = fieldsList.get(i);
                    historyBuilder.metric(field.getName());
                    if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                        if (fieldsList.get(i).getType() == CommonConstants.TYPE_NUMBER) {
                            historyBuilder.metricType(CommonConstants.TYPE_NUMBER)
                                            .dou(Double.parseDouble(valueRow.getColumns(i)));
                        } else if (fieldsList.get(i).getType() == CommonConstants.TYPE_STRING) {
                            historyBuilder.metricType(CommonConstants.TYPE_STRING)
                                    .str(formatStrValue(valueRow.getColumns(i)));
                        }
                    } else {
                        if (fieldsList.get(i).getType() == CommonConstants.TYPE_NUMBER) {
                            historyBuilder.metricType(CommonConstants.TYPE_NUMBER).dou(null);
                        } else if (fieldsList.get(i).getType() == CommonConstants.TYPE_STRING) {
                            historyBuilder.metricType(CommonConstants.TYPE_STRING).str(null);
                        }
                    }
                    historyList.add(historyBuilder.build());
                }
            }
            historyDao.saveAll(historyList);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 从数据库获取指标历史数据
     *
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标集合名
     * @param metric 指标名
     * @param instance 实例
     * @param history 历史范围
     * @return 指标历史数据列表
     */
    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        Specification<History> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            Predicate predicateMonitorId = criteriaBuilder.equal(root.get("monitorId"), monitorId);
            Predicate predicateMonitorType = criteriaBuilder.equal(root.get("app"), app);
            Predicate predicateMonitorMetrics = criteriaBuilder.equal(root.get("metrics"), metrics);
            Predicate predicateMonitorMetric = criteriaBuilder.equal(root.get("metric"), metric);
            andList.add(predicateMonitorId);
            andList.add(predicateMonitorType);
            andList.add(predicateMonitorMetrics);
            andList.add(predicateMonitorMetric);
            if (instance != null && !"".equals(instance)) {
                Predicate predicateMonitorInstance = criteriaBuilder.equal(root.get("instance"), instance);
                andList.add(predicateMonitorInstance);
            }
            if (history != null) {
                try {
                    TemporalAmount temporalAmount = TimePeriodUtil.parseTokenTime(history);
                    ZonedDateTime dateTime = ZonedDateTime.now().minus(temporalAmount);
                    long timeBefore = dateTime.toEpochSecond() * 1000;
                    Predicate timePredicate = criteriaBuilder.ge(root.get("time"), timeBefore);
                    andList.add(timePredicate);
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
            Predicate[] predicates = new Predicate[andList.size()];
            Predicate predicate = criteriaBuilder.and(andList.toArray(predicates));
            return query.where(predicate).getRestriction();
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.DESC, "time"));
        List<History> historyList = historyDao.findAll(specification, sortExp);
        for (History dataItem : historyList) {
            String value = "";
            if (dataItem.getMetricType() == CommonConstants.TYPE_NUMBER) {
                if (dataItem.getDou() != null) {
                    value = BigDecimal.valueOf(dataItem.getDou()).setScale(4, RoundingMode.HALF_UP)
                            .stripTrailingZeros().toPlainString();
                }
            } else {
                value = dataItem.getStr();
            }
            String instanceValue = dataItem.getInstance() == null ? "" : dataItem.getInstance();
            List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
            valueList.add(new Value(value, dataItem.getTime()));
        }
        return instanceValuesMap;
    }

    private String formatStrValue(String value) {
        if (value == null) {
            return "";
        }
        value = value.replace("'", "\\'");
        value = value.replace("\"", "\\\"");
        value = value.replace("*", "-");
        value = String.format("`%s`", value);
        if (value.length() > STRING_MAX_LENGTH) {
            value = value.substring(0, STRING_MAX_LENGTH - 1);
        }
        return value;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        return new HashMap<>(8);
    }

    @Override
    public void destroy() throws Exception {}
}
