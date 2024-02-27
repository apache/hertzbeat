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

import org.dromara.hertzbeat.common.entity.manager.ParamDefine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Param Define Database Operations
 * ParamDefine数据库操作
 *
 * @author tomsun28
 *
 */
public interface ParamDefineDao extends JpaRepository<ParamDefine, Long> {

    /**
     * Query the parameter definitions under it according to the monitoring type
     * 根据监控类型查询其下的参数定义
     *
     * @param app Monitoring type       监控类型
     * @return parameter definition list        参数定义列表
     */
    List<ParamDefine> findParamDefinesByApp(String app);
}
