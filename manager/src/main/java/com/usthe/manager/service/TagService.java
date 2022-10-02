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

package com.usthe.manager.service;

import com.usthe.common.entity.manager.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.HashSet;
import java.util.List;

/**
 * 标签服务
 *
 * @author tom
 * @date 2022/5/1 11:22
 */
public interface TagService {

    /**
     * new tags
     * @param tags tag
     */
    void addTags(List<Tag> tags);

    /**
     * update tag
     * @param tag Tag
     */
    void modifyTag(Tag tag);

    /**
     * get tag page list
     * @param specification 查询条件
     * @param pageRequest 分页条件
     * @return Tags
     */
    Page<Tag> getTags(Specification<Tag> specification, PageRequest pageRequest);

    /**
     * delete tags
     * @param ids tag id list
     */
    void deleteTags(HashSet<Long> ids);
}
