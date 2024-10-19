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

package org.apache.hertzbeat.templatehub.service;

import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.springframework.data.domain.Page;

import java.util.List;

public interface StarService {
    int starTemplate(int userId, int templateId, String nowTime);

    boolean assertTemplateIdIsStarByUser(int userId, int templateId);

    List<Integer> getTemplateByUserStar(int userId, int isDel);

    Page<TemplateDO> getPageByUserStar(int userId, int isCancel, int isDel, int offShelf, int page, int size);

    Boolean cancelStarByUser(int userId, int templateId);
}
