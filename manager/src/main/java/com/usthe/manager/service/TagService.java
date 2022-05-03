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
     * @param tag tag
     */
    void modifyTag(Tag tag);

    /**
     * get tag page list
     * @param specification 查询条件
     * @param pageRequest 分页条件
     * @return tags
     */
    Page<Tag> getTags(Specification<Tag> specification, PageRequest pageRequest);

    /**
     * delete tags
     * @param ids tag id list
     */
    void deleteTags(HashSet<Long> ids);
}
