package com.usthe.alert.controller;

import com.usthe.alert.dto.AlertSummary;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.alert.service.AlertService;
import com.usthe.common.entity.dto.Message;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * 告警管理API
 * @author tom
 * @date 2021/12/9 10:32
 */
@Api(tags = "告警批量管理API")
@RestController
@RequestMapping(path = "/alerts", produces = {APPLICATION_JSON_VALUE})
public class AlertsController {

    @Autowired
    private AlertService alertService;

    @GetMapping
    @ApiOperation(value = "查询告警列表", notes = "根据查询过滤项获取告警信息列表")
    public ResponseEntity<Message<Page<Alert>>> getAlerts(
            @ApiParam(value = "告警ID", example = "6565466456") @RequestParam(required = false) List<Long> ids,
            @ApiParam(value = "告警监控对象ID", example = "6565463543") @RequestParam(required = false) Long monitorId,
            @ApiParam(value = "告警级别", example = "6565463543") @RequestParam(required = false) Byte priority,
            @ApiParam(value = "告警状态", example = "6565463543") @RequestParam(required = false) Byte status,
            @ApiParam(value = "告警内容模糊查询", example = "linux") @RequestParam(required = false) String content,
            @ApiParam(value = "排序字段，默认id", example = "name") @RequestParam(defaultValue = "id") String sort,
            @ApiParam(value = "排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @ApiParam(value = "列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @ApiParam(value = "列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<Alert> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();

            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate= criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (monitorId != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("monitorId"), monitorId);
                andList.add(predicate);
            }
            if (priority != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("priority"), priority);
                andList.add(predicate);
            }
            if (status != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicate);
            }
            if (content != null && !"".equals(content)) {
                Predicate predicateContent = criteriaBuilder.like(root.get("content"), "%" + content + "%");
                andList.add(predicateContent);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<Alert> alertPage = alertService.getAlerts(specification, pageRequest);
        Message<Page<Alert>> message = new Message<>(alertPage);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @ApiOperation(value = "批量删除告警", notes = "根据告警ID列表批量删除告警")
    public ResponseEntity<Message<Void>> deleteAlertDefines(
            @ApiParam(value = "告警IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            alertService.deleteAlerts(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

    @PutMapping(path = "/status/{status}")
    @ApiOperation(value = "批量修改告警状态", notes = "批量修改告警状态,设置已读未读")
    public ResponseEntity<Message<Void>> applyAlertDefinesStatus(
            @ApiParam(value = "告警状态值", example = "0") @PathVariable Byte status,
            @ApiParam(value = "告警IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        if (ids != null && status != null && !ids.isEmpty()) {
            alertService.editAlertStatus(status, ids);
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

    @GetMapping(path = "/summary")
    @ApiOperation(value = "获取告警统计信息", notes = "获取告警统计信息")
    public ResponseEntity<Message<AlertSummary>> getAlertsSummary() {
        AlertSummary alertSummary = alertService.getAlertsSummary();
        Message<AlertSummary> message = new Message<>(alertSummary);
        return ResponseEntity.ok(message);
    }
}
