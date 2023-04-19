package org.dromara.hertzbeat.alert.service;

import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;

/**
 * management interface service for alert silence
 *
 *
 */
public interface AlertSilenceService {
	/**
	 * Verify the correctness of the request data parameters
	 * 校验请求数据参数正确性
	 * @param alertSilence AlertSilence
	 * @param isModify 是否是修改配置
	 * @throws IllegalArgumentException A checksum parameter error is thrown ｜ 校验参数错误抛出
	 */
	void validate(AlertSilence alertSilence, boolean isModify) throws IllegalArgumentException;

	/**
	 * New AlertSilence
	 * @param alertSilence AlertSilence Entity ｜ 静默策略实体
	 * @throws RuntimeException Added procedure exception throwing ｜ 新增过程异常抛出
	 */
	void addAlertSilence(AlertSilence alertSilence) throws RuntimeException;

	/**
	 * Modifying an AlertSilence ｜ 修改静默策略
	 * @param alertSilence Alarm definition Entity ｜ 静默策略实体
	 * @throws RuntimeException Exception thrown during modification ｜ 修改过程中异常抛出
	 */
	void modifyAlertSilence(AlertSilence alertSilence) throws RuntimeException;

	/**
	 * Obtain AlertSilence information
	 * @param silenceId AlertSilence ID
	 * @return AlertSilence
	 * @throws RuntimeException An exception was thrown during the query ｜ 查询过程中异常抛出
	 */
	AlertSilence getAlertSilence(long silenceId) throws RuntimeException;


	/**
	 * Delete AlertSilence in batches ｜ 批量删除静默策略
	 * @param silenceIds AlertSilence IDs ｜ 静默策略IDs
	 * @throws RuntimeException Exception thrown during deletion ｜ 删除过程中异常抛出
	 */
	void deleteAlertSilences(Set<Long> silenceIds) throws RuntimeException;

	/**
	 * Dynamic conditional query
	 * 动态条件查询
	 * @param specification Query conditions ｜ 查询条件
	 * @param pageRequest Paging parameters ｜ 分页参数
	 * @return The query results ｜ 查询结果
	 */
	Page<AlertSilence> getAlertSilences(Specification<AlertSilence> specification, PageRequest pageRequest);
}
