package org.apache.hertzbeat.manager.service;

import java.util.List;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.manager.pojo.dto.Bulletin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * Bulletin Service
 */
public interface BulletinService {

    /**
     * validate Bulletin
     */
    void validate(Bulletin bulletin, Boolean isModify) throws IllegalArgumentException;

    /**
     * List Bulletin
     */
    List<Bulletin> listBulletin();

    /**
     * Save Bulletin
     */
    void saveBulletin(Bulletin bulletin);

    /**
     * Dynamic conditional query
     * @param specification Query conditions
     * @param pageRequest Paging parameters
     * @return The query results
     */
    Page<Bulletin> getBulletins(Specification<Bulletin> specification, PageRequest pageRequest);

}
