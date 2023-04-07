/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.dromara.hertzbeat.warehouse.store;

import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.entity.warehouse.History;
import org.dromara.hertzbeat.common.util.CommonConstants;
import org.dromara.hertzbeat.common.util.TimePeriodUtil;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import org.dromara.hertzbeat.warehouse.dao.HistoryDao;
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
	private static final int MAX_HISTORY_TABLE_RECORD = 60_000;

	public HistoryJpaDatabaseDataStorage(WarehouseProperties properties,
	                                     HistoryDao historyDao) {
		this.jpaProperties = properties.getStore().getJpa();
		this.serverAvailable = true;
		this.historyDao = historyDao;
	}

	@Scheduled(fixedDelay = 1, timeUnit = TimeUnit.MINUTES)
	public void expiredDataCleaner() {
		log.warn("[jpa-metrics-store]-start running expired data cleaner." +
				"Please use time series db instead of jpa for better performance");
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
			log.error("expiredDataCleaner time error: {}. use default expire time to clean: 1h", e.getMessage());
			ZonedDateTime dateTime = ZonedDateTime.now().minus(Duration.ofHours(1));
			expireTime = dateTime.toEpochSecond() * 1000;
		}
		try {
			int rows = historyDao.deleteHistoriesByTimeBefore(expireTime);
			log.info("[jpa-metrics-store]-delete {} rows.", rows);
			long total = historyDao.count();
			if (total > MAX_HISTORY_TABLE_RECORD) {
				rows = historyDao.deleteOlderHistoriesRecord();
				log.warn("[jpa-metrics-store]-force delete {} rows due too many. Please use time series db instead of jpa for better performance.", rows);
			}
		} catch (Exception e) {
			log.error("expiredDataCleaner database error: {}.", e.getMessage());
			log.error("try to truncate table hzb_history. Please use time series db instead of jpa for better performance.");
			historyDao.truncateTable();
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
					// ignore string value store in db
					if (field.getType() == CommonConstants.TYPE_STRING) {
						continue;
					}
					historyBuilder.metric(field.getName());
					if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
						if (field.getType() == CommonConstants.TYPE_NUMBER) {
							historyBuilder.metricType(CommonConstants.TYPE_NUMBER)
									.dou(Double.parseDouble(valueRow.getColumns(i)));
						} else if (field.getType() == CommonConstants.TYPE_STRING) {
							historyBuilder.metricType(CommonConstants.TYPE_STRING)
									.str(formatStrValue(valueRow.getColumns(i)));
						}
					} else {
						if (field.getType() == CommonConstants.TYPE_NUMBER) {
							historyBuilder.metricType(CommonConstants.TYPE_NUMBER).dou(null);
						} else if (field.getType() == CommonConstants.TYPE_STRING) {
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
	 * @param app       监控类型
	 * @param metrics   指标集合名
	 * @param metric    指标名
	 * @param instance  实例
	 * @param history   历史范围
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
	public void destroy() throws Exception {
	}
}
