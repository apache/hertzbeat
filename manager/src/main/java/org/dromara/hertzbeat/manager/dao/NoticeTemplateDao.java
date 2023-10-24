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

package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * NoticeTemplate数据库操作
 *
 * @author Eden
 */
public interface NoticeTemplateDao extends JpaRepository<NoticeTemplate, Long>, JpaSpecificationExecutor<NoticeTemplate> {
    /**
     * 通过模板类型和预设模板标识查找通知模板
     *
     * @param type            Byte type 模板类型
     * @param defaultTemplate Boolean defaultTemplate 预设模板标识
     * @return 通知模板
     */
    NoticeTemplate findNoticeTemplateByTypeAndPresetTemplate(Byte type, Boolean defaultTemplate);


}
