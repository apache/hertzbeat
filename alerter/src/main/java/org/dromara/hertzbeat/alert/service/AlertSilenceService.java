package org.dromara.hertzbeat.alert.service;

import org.dromara.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;

/**
 * management interface service for alert silence
 *
 * @author tom
 */
public interface AlertSilenceService {
    /**
     * Verify the correctness of the request data parameters
     *
     * @param alertSilence AlertSilence
     * @param isModify     whether modify
     * @throws IllegalArgumentException A checksum parameter error is thrown
     */
    void validate(AlertSilence alertSilence, boolean isModify) throws IllegalArgumentException;

    /**
     * New AlertSilence
     *
     * @param alertSilence AlertSilence Entity
     * @throws RuntimeException Added procedure exception throwing
     */
    void addAlertSilence(AlertSilence alertSilence) throws RuntimeException;

    /**
     * Modifying an AlertSilence
     *
     * @param alertSilence Alarm definition Entity
     * @throws RuntimeException Exception thrown during modification
     */
    void modifyAlertSilence(AlertSilence alertSilence) throws RuntimeException;

    /**
     * Obtain AlertSilence information
     *
     * @param silenceId AlertSilence ID
     * @return AlertSilence
     * @throws RuntimeException An exception was thrown during the query
     */
    AlertSilence getAlertSilence(long silenceId) throws RuntimeException;


    /**
     * Delete AlertSilence in batches
     *
     * @param silenceIds AlertSilence IDs
     * @throws RuntimeException Exception thrown during deletion
     */
    void deleteAlertSilences(Set<Long> silenceIds) throws RuntimeException;

    /**
     * Dynamic conditional query
     *
     * @param specification Query conditions
     * @param pageRequest   Paging parameters
     * @return The query results
     */
    Page<AlertSilence> getAlertSilences(Specification<AlertSilence> specification, PageRequest pageRequest);
}
