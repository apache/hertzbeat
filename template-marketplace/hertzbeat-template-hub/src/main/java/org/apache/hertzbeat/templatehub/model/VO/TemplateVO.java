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

package org.apache.hertzbeat.templatehub.model.VO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;

@Data
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class TemplateVO {

    private Integer id;
    private String name;
    private String description;
    private Integer latest;
    private Integer user;
    private Integer categoryId;
    private Integer tag;
    private Integer download;
    private Integer star;
    private String createTime;
    private String updateTime;
    private Integer offShelf;
    private Integer isDel;
    private boolean starByNowUser =false;

    public TemplateVO(TemplateDO template, boolean isStarByNowUser) {
        this.id = template.getId();
        this.name = template.getName();
        this.description = template.getDescription();
        this.latest = template.getLatest();
        this.user = template.getUser();
        this.categoryId = template.getCategoryId();
        this.tag = template.getTag();
        this.download = template.getDownload();
        this.star = template.getStar();
        this.createTime = template.getCreateTime();
        this.updateTime = template.getUpdateTime();
        this.offShelf = template.getOffShelf();
        this.isDel = template.getIsDel();
        this.starByNowUser = isStarByNowUser;
    }
}
