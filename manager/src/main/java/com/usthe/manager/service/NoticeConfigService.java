package com.usthe.manager.service;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.entity.manager.NoticeRule;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

/**
 * 消息通知配置接口
 * @author tom
 * @date 2021/12/16 16:14
 */
public interface NoticeConfigService {

    /**
     * 动态条件查询
     * @param specification 查询条件
     * @return 查询结果
     */
    List<NoticeReceiver> getNoticeReceivers(Specification<NoticeReceiver> specification);

    /**
     * 动态条件查询
     * @param specification 查询条件
     * @return 查询结果
     */
    List<NoticeRule> getNoticeRules(Specification<NoticeRule> specification);

    /**
     * 新增一个通知接收人
     * @param noticeReceiver 接收人信息
     */
    void addReceiver(NoticeReceiver noticeReceiver);

    /**
     * 修改通知接收人
     * @param noticeReceiver 接收人信息
     */
    void editReceiver(NoticeReceiver noticeReceiver);

    /**
     * 根据接收人ID删除接收人信息
     * @param receiverId 接收人ID
     */
    void deleteReceiver(Long receiverId);

    /**
     * 新增通知策略
     * @param noticeRule 通知策略
     */
    void addNoticeRule(NoticeRule noticeRule);

    /**
     * 修改通知策略
     * @param noticeRule 通知策略
     */
    void editNoticeRule(NoticeRule noticeRule);

    /**
     * 删除指定的通知策略
     * @param ruleId 通知策略ID
     */
    void deleteNoticeRule(Long ruleId);

    /**
     * 根据告警信息与所有通知策略匹配，过滤出需要通知的接收人
     * @param alert 告警信息
     * @return 接收人
     */
    List<NoticeReceiver> getReceiverFilterRule(Alert alert);
}
