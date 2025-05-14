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

package org.apache.hertzbeat.manager.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.hertzbeat.common.entity.manager.Label;
import org.springframework.data.domain.Page;

/**
 * Label service
 */
public interface LabelService {

    /**
     * new Label
     * @param label label
     */
    void addLabel(Label label);

    /**
     * update label
     * @param label label
     */
    void modifyLabel(Label label);

    /**
     * get label page list
     * @param search        label content search
     * @param type          label type
     * @param pageIndex     List current page
     * @param pageSize      Number of list pagination
     * @return label
     */
    Page<Label> getLabels(String search, Byte type, int pageIndex, int pageSize);

    /**
     * delete labels
     * @param ids label id list
     */
    void deleteLabels(HashSet<Long> ids);

    /**
     * Identifies new labels from the given entry that are not yet in the database
     * @param originLabels k-v entry
     * @return new labels
     */
    List<Label> determineNewLabels(Set<Map.Entry<String, String>> originLabels);
}
