package org.dromara.hertzbeat.alert.service;

import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;

/**
 * management interface service for alert converge
 * @author tom
 *
 */
public interface AlertConvergeService {
	/**
	 * Verify the correctness of the request data parameters
	 * 校验请求数据参数正确性
	 * @param alertConverge AlertConverge
	 * @param isModify 是否是修改配置
	 * @throws IllegalArgumentException A checksum parameter error is thrown ｜ 校验参数错误抛出
	 */
	void validate(AlertConverge alertConverge, boolean isModify) throws IllegalArgumentException;

	/**
	 * New AlertConverge
	 * @param alertConverge AlertConverge Entity ｜ 收敛策略实体
	 * @throws RuntimeException Added procedure exception throwing ｜ 新增过程异常抛出
	 */
	void addAlertConverge(AlertConverge alertConverge) throws RuntimeException;

	/**
	 * Modifying an AlertConverge ｜ 修改收敛策略
	 * @param alertConverge Alarm definition Entity ｜ 收敛策略实体
	 * @throws RuntimeException Exception thrown during modification ｜ 修改过程中异常抛出
	 */
	void modifyAlertConverge(AlertConverge alertConverge) throws RuntimeException;

	/**
	 * Obtain AlertConverge information
	 * @param convergeId AlertConverge ID
	 * @return AlertConverge
	 * @throws RuntimeException An exception was thrown during the query ｜ 查询过程中异常抛出
	 */
	AlertConverge getAlertConverge(long convergeId) throws RuntimeException;


	/**
	 * Delete AlertConverge in batches ｜ 批量删除收敛策略
	 * @param convergeIds AlertConverge IDs ｜ 收敛策略IDs
	 * @throws RuntimeException Exception thrown during deletion ｜ 删除过程中异常抛出
	 */
	void deleteAlertConverges(Set<Long> convergeIds) throws RuntimeException;

	/**
	 * Dynamic conditional query
	 * 动态条件查询
	 * @param specification Query conditions ｜ 查询条件
	 * @param pageRequest Paging parameters ｜ 分页参数
	 * @return The query results ｜ 查询结果
	 */
	Page<AlertConverge> getAlertConverges(Specification<AlertConverge> specification, PageRequest pageRequest);
}
