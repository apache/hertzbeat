package com.usthe.manager.controller;

import com.usthe.common.entity.dto.Message;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.manager.service.MonitorService;
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
 * Monitor and manage batch API
 * 监控管理批量API
 *
 * @author tom
 * @date 2021/12/1 20:43
 */
@Api(tags = "Monitor Manage Batch API | 监控列表API")
@RestController
@RequestMapping(path = "/monitors", produces = {APPLICATION_JSON_VALUE})
public class MonitorsController {

    private static final byte ALL_MONITOR_STATUS = 9;

    @Autowired
    private MonitorService monitorService;

    @GetMapping
    @ApiOperation(value = "Obtain a list of monitoring information based on query filter items",
            notes = "根据查询过滤项获取监控信息列表")
    public ResponseEntity<Message<Page<Monitor>>> getMonitors(
            @ApiParam(value = "en: Monitor ID,zh: 监控ID", example = "6565463543") @RequestParam(required = false) final List<Long> ids,
            @ApiParam(value = "en: Monitor Type,zh: 监控类型", example = "linux") @RequestParam(required = false) final String app,
            @ApiParam(value = "en: Monitor Name,zh: 监控名称，模糊查询", example = "linux-127.0.0.1") @RequestParam(required = false) final String name,
            @ApiParam(value = "en: Monitor Host,zh: 监控Host，模糊查询", example = "127.0.0.1") @RequestParam(required = false) final String host,
            @ApiParam(value = "en: Monitor Status,zh: 监控状态 0:未监控,1:可用,2:不可用,3:不可达,4:挂起,9:全部状态", example = "1") @RequestParam(required = false) final Byte status,
            @ApiParam(value = "en: Sort Field,default id,zh: 排序字段，默认id", example = "name") @RequestParam(defaultValue = "id") final String sort,
            @ApiParam(value = "en: Sort by,zh: 排序方式，asc:升序，desc:降序", example = "desc") @RequestParam(defaultValue = "desc") final String order,
            @ApiParam(value = "en: List current page,zh: 列表当前分页", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @ApiParam(value = "en: Number of list pagination,zh: 列表分页数量", example = "8") @RequestParam(defaultValue = "8") int pageSize) {

        Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (ids != null && !ids.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : ids) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (app != null && !"".equals(app)) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("app"), app);
                andList.add(predicateApp);
            }
            if (status != null && status >= 0 && status < ALL_MONITOR_STATUS) {
                Predicate predicateStatus = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicateStatus);
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (host != null && !"".equals(host)) {
                Predicate predicateHost = criteriaBuilder.like(root.get("host"), "%" + host + "%");
                orList.add(predicateHost);
            }
            if (name != null && !"".equals(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                orList.add(predicateName);
            }
            Predicate[] orPredicates = new Predicate[orList.size()];
            Predicate orPredicate = criteriaBuilder.or(orList.toArray(orPredicates));

            if (andPredicate.getExpressions().isEmpty() && orPredicate.getExpressions().isEmpty()) {
                return query.where().getRestriction();
            } else if (andPredicate.getExpressions().isEmpty()) {
                return query.where(orPredicate).getRestriction();
            } else if (orPredicate.getExpressions().isEmpty()) {
                return query.where(andPredicate).getRestriction();
            } else {
                return query.where(andPredicate, orPredicate).getRestriction();
            }
        };
        // Pagination is a must         分页是必须的
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        Page<Monitor> monitorPage = monitorService.getMonitors(specification, pageRequest);
        Message<Page<Monitor>> message = new Message<>(monitorPage);
        return ResponseEntity.ok(message);
    }

    @GetMapping(path = "/{app}")
    @ApiOperation(value = "Filter all acquired monitoring information lists of the specified monitoring type according to the query",
            notes = "根据查询过滤指定监控类型的所有获取监控信息列表")
    public ResponseEntity<Message<List<Monitor>>> getAppMonitors(
            @ApiParam(value = "en: Monitoring type,zh: 监控类型", example = "linux") @PathVariable(required = false) final String app) {
        List<Monitor> monitors = monitorService.getAppMonitors(app);
        Message<List<Monitor>> message = new Message<>(monitors);
        return ResponseEntity.ok(message);
    }

    @DeleteMapping
    @ApiOperation(value = "Delete monitoring items in batches according to the monitoring ID list",
            notes = "根据监控ID列表批量删除监控项")
    public ResponseEntity<Message<Void>> deleteMonitors(
            @ApiParam(value = "en: Monitoring ID List,zh: 监控ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.deleteMonitors(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

    @DeleteMapping("manage")
    @ApiOperation(value = "Unmanaged monitoring items in batches according to the monitoring ID list",
            notes = "根据监控ID列表批量取消纳管监控项")
    public ResponseEntity<Message<Void>> cancelManageMonitors(
            @ApiParam(value = "en: Monitoring ID List,zh: 监控ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.cancelManageMonitors(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

    @GetMapping("manage")
    @ApiOperation(value = "Start the managed monitoring items in batches according to the monitoring ID list",
            notes = "根据监控ID列表批量启动纳管监控项")
    public ResponseEntity<Message<Void>> enableManageMonitors(
            @ApiParam(value = "en: Monitor ID List,zh: 监控ID列表", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            monitorService.enableManageMonitors(new HashSet<>(ids));
        }
        Message<Void> message = new Message<>();
        return ResponseEntity.ok(message);
    }

}
