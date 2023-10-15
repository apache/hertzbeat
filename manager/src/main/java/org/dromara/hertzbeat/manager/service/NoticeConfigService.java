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

package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

/**
 * Message notification configuration interface
 * 消息通知配置接口
 *
 * @author tom
 */
public interface NoticeConfigService {

    /**
     * Dynamic conditional query
     * 动态条件查询
     *
     * @param specification Query conditions    查询条件
     * @return Search result    查询结果
     */
    List<NoticeReceiver> getNoticeReceivers(Specification<NoticeReceiver> specification);
//    Map<NoticeReceiver,NoticeTemplate> getNoticeReceiversAndTemplate(Specification<NoticeReceiver> specification);

    /**
     * Dynamic conditional query
     * 动态条件查询
     *
     * @param specification Query conditions    查询条件
     * @return Search result    查询结果
     */
    List<NoticeTemplate> getNoticeTemplates(Specification<NoticeTemplate> specification);

    /**
     * Dynamic conditional query
     * 动态条件查询
     *
     * @param specification Query conditions    查询条件
     * @return Search result    查询结果
     */
    List<NoticeRule> getNoticeRules(Specification<NoticeRule> specification);

    /**
     * Add a notification recipient
     * 新增一个通知接收人
     *
     * @param noticeReceiver recipient information  接收人信息
     */
    void addReceiver(NoticeReceiver noticeReceiver);

    /**
     * Modify notification recipients
     * 修改通知接收人
     *
     * @param noticeReceiver recipient information  接收人信息
     */
    void editReceiver(NoticeReceiver noticeReceiver);

    /**
     * Delete recipient information based on recipient ID
     * 根据接收人ID删除接收人信息
     *
     * @param receiverId Recipient ID   接收人ID
     */
    void deleteReceiver(Long receiverId);

    /**
     * Added notification policy
     * 新增通知策略
     *
     * @param noticeRule Notification strategy  通知策略
     */
    void addNoticeRule(NoticeRule noticeRule);

    /**
     * Modify Notification Policy
     * 修改通知策略
     *
     * @param noticeRule Notification strategy  通知策略
     */
    void editNoticeRule(NoticeRule noticeRule);

    /**
     * Delete the specified notification policy
     * 删除指定的通知策略
     *
     * @param ruleId Notification Policy ID     通知策略ID
     */
    void deleteNoticeRule(Long ruleId);

    /**
     * According to the alarm information matching all notification policies, filter out the recipients who need to be notified
     * 根据告警信息与所有通知策略匹配，过滤出需要通知的接收人
     *
     * @param alert Alarm information       告警信息
     * @return Receiver     接收人
     */
    List<NoticeReceiver> getReceiverFilterRule(Alert alert);

    /**
     * According to the alarm information matching all notification policies, filter out the recipients' ID who need to be notified
     * 根据告警信息与所有通知策略匹配，过滤出需要通知的接收人ID
     *
     * @param alert Alarm information       告警信息
     * @return Receiver ID     接收人
     */
    List<Long> getReceiverIdFilterRule(Alert alert);

    /**
     * According to the alarm information matching all notification policies, filter out the templates' ID
     * 根据告警信息与所有通知策略匹配，过滤出需要通知模板ID
     *
     * @param alert Alarm information       告警信息
     * @return Template ID     通知模板
     */
    List<Long> getTemplateIdFilterRule(Alert alert);

    /**
     * Query the recipient information according to the recipient ID List
     * 根据接收人ID列表查询接收人信息
     *
     * @param ids Reciver ID List     接收人ID列表
     * @return Receiver     接收人
     */
    NoticeReceiver getOneReciverByIdInFilterRule(List<Long> ids);

    /**
     * Query the template information according to the template ID List
     * 根据通知模板ID列表查询模板信息
     *
     * @param ids Template ID List      接收人ID列表
     * @return Template     通知模板
     */
    NoticeTemplate getOneTemplateByIdInFilterRule(List<Long> ids);

    /**
     * Query recipient information based on recipient ID (primary key Id)
     * 根据接收人ID(主键Id)查询接收人信息
     *
     * @param receiverId Receiver ID (primary key ID)  接收人ID(主键ID)
     * @return Recipient Entity        接收人实体
     */
    NoticeReceiver getReceiverById(Long receiverId);

    /**
     * Query specific notification rules according to the rule ID (primary key ID)
     * 根据规则ID(主键ID)查询具体通知规则
     *
     * @param ruleId Rule ID     规则ID(主键ID)
     * @return Notification Rule Entity    通知规则实体
     */
    NoticeRule getNoticeRulesById(Long ruleId);

    /**
     * Add a notification template
     * 新增一个通知接收人
     *
     * @param noticeTemplate template information  接收人信息
     */
    void addNoticeTemplate(NoticeTemplate noticeTemplate);

    /**
     * Modify notification templates
     * 修改通知接收人
     *
     * @param noticeTemplate template information  接收人信息
     */
    void editNoticeTemplate(NoticeTemplate noticeTemplate);

    /**
     * Delete template information based on Template ID
     * 根据通知模板ID删除通知模板信息
     *
     * @param templateId Template ID   接收人ID
     */
    void deleteNoticeTemplate(Long templateId);


    /**
     * Query specific notification templates according to the template ID (primary key ID)
     * 根据模板ID(主键ID)查询具体通知规则
     *
     * @param templateId Template ID     模板ID(主键ID)
     * @return Notification Template Entity    通知模板实体
     */
    Optional<NoticeTemplate> getNoticeTemplatesById(Long templateId);

    /**
     * Query specific notification templates according to the template type and default
     * 根据模板类型和预设模板标识查询具体通知规则
     *
     * @param type            Template type     模板类型
     * @param defaultTemplate Preset template identification     预设模板标识
     * @return Notification Template Entity    通知模板实体
     */
    NoticeTemplate findNoticeTemplateByTypeAndDefault(Byte type, Boolean defaultTemplate);


    /**
     * alert Send test message
     * 告警 发送测试消息
     *
     * @param noticeReceiver recipient information  接收人信息
     * @return true send success | false send fail
     */
    boolean sendTestMsg(NoticeReceiver noticeReceiver);


}
