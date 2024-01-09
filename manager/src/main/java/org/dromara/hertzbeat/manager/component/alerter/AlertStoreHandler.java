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

package org.dromara.hertzbeat.manager.component.alerter;

import org.dromara.hertzbeat.common.entity.alerter.Alert;

/**
 * 报警持久化
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 */
public interface AlertStoreHandler {

    /**
     * 持久化报警记录
     * 需在持久化的同时对alert的标签信息tags关联赋值
     *
     * @param alert 报警
     */
    void store(Alert alert);
}
