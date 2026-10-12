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

package org.apache.hertzbeat.manager.service.entity;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Write-model boundary for old monitor submitted labels.
 */
@Service
public class OldMonitorLabelWriteModelService {

    private final LabelDao labelDao;

    private final LabelService labelService;

    public OldMonitorLabelWriteModelService(LabelDao labelDao, LabelService labelService) {
        this.labelDao = labelDao;
        this.labelService = labelService;
    }

    public void saveNewLabels(Map<String, String> labels) {
        if (CollectionUtils.isEmpty(labels)) {
            return;
        }
        List<Label> addLabels = labelService.determineNewLabels(labels.entrySet());
        if (!addLabels.isEmpty()) {
            labelDao.saveAll(addLabels);
        }
    }
}
