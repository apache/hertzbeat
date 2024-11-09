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

package org.apache.hertzbeat.manager.dao;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Param Define Database Operations
 */
public interface ParamDefineDao extends JpaRepository<ParamDefine, Long> {

    /**
     * Query the parameter definitions under it according to the monitoring type
     * @param app Monitoring type
     * @return parameter definition list
     */
    List<ParamDefine> findParamDefinesByApp(String app);
}
