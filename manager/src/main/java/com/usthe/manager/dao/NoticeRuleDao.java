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

package com.usthe.manager.dao;

import com.usthe.common.entity.manager.NoticeRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * NoticeRule数据库操作
 * @author tom
 * @date 2021/12/16 16:13
 */
public interface NoticeRuleDao extends JpaRepository<NoticeRule, Long>, JpaSpecificationExecutor<NoticeRule> {

    /**
     * 查询所有已启用的通知策略
     * @return 通知策略
     */
    List<NoticeRule> findNoticeRulesByEnableTrue();

    /**
     * 查询某接收人对应的规则
     * @return 通知策略
     */
    List<NoticeRule> findNoticeRulesByReceiverId(Long receiveId);

    /**
     * 查询对应时间段配置对应的规则
     * @return 通知策略
     */
    List<NoticeRule> findNoticeRulesByPeriodId(Long periodId);

    /**
     * 清空对应规则的通知时间策略ID
     * @param periodId 通知时间策略ID
     */
    @Modifying
    @Query(value = "update NoticeRule set periodId = null where periodId = ?1")
    void clearNoticePeriod(Long periodId);
}
