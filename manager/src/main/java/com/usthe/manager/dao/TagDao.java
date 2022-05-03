package com.usthe.manager.dao;

import com.usthe.common.entity.manager.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Set;

/**
 * tag repository
 *
 *
 */
public interface TagDao extends JpaRepository<Tag, Long>, JpaSpecificationExecutor<Tag> {

    /**
     * delete tags by tag id
     * @param ids id list
     */
    void deleteTagsByIdIn(Set<Long> ids);
}
