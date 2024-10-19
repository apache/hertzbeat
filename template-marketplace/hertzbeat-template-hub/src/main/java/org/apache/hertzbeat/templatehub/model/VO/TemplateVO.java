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
