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

import org.dromara.hertzbeat.common.entity.manager.GeneralConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Component;

/**
 * 公共服务端配置Dao
 * todo common config data cache
 * <p>该接口继承了JpaRepository和JpaSpecificationExecutor两个接口，提供基本的CRUD操作和规范查询能力。</p>
 *
 * @author zqr10159
 */
@Component
public interface GeneralConfigDao extends JpaRepository<GeneralConfig, Long>, JpaSpecificationExecutor<GeneralConfig> {
    
    /**
     * 通过类型查询
     *
     * @param type 类型
     * @return 返回查询到的配置信息
     */
    GeneralConfig findByType(String type);
}
