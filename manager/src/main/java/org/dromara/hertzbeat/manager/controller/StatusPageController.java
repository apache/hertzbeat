package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.StatusPageComponent;
import org.dromara.hertzbeat.common.entity.manager.StatusPageIncident;
import org.dromara.hertzbeat.common.entity.manager.StatusPageOrg;
import org.dromara.hertzbeat.manager.service.StatusPageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * status page endpoint controller
 * @author tom
 */
@Tag(name = "Status Page API | 状态页API")
@RestController()
@RequestMapping(value = "/api/status/page", produces = {APPLICATION_JSON_VALUE})
public class StatusPageController {


    @Autowired
    private StatusPageService statusPageService;
    
    @GetMapping("/org")
    @Operation(summary = "Query Status Page Organization")
    public ResponseEntity<Message<StatusPageOrg>> queryStatusPageOrg() {
        StatusPageOrg statusPageOrg = statusPageService.queryStatusPageOrg();
        if (statusPageOrg == null) {
            return ResponseEntity.ok(Message.fail(CommonConstants.FAIL_CODE, "Status Page Organization Not Found"));
        }
        return ResponseEntity.ok(Message.success(statusPageOrg));
    }

    @PostMapping("/org")
    @Operation(summary = "Save and Update Query Status Page Organization")
    public ResponseEntity<Message<StatusPageOrg>> saveStatusPageOrg(@Valid @RequestBody StatusPageOrg statusPageOrg) {
        StatusPageOrg org = statusPageService.saveStatusPageOrg(statusPageOrg);
        return ResponseEntity.ok(Message.success(org));
    }
    
    @GetMapping("/component")
    @Operation(summary = "Query Status Page Components")
    public ResponseEntity<Message<List<StatusPageComponent>>> queryStatusPageComponent() {
        List<StatusPageComponent> statusPageComponents = statusPageService.queryStatusPageComponents();
        return ResponseEntity.ok(Message.success(statusPageComponents));
    }
    
    @PostMapping("/component")
    @Operation(summary = "Save Status Page Component")
    public ResponseEntity<Message<Void>> newStatusPageComponent(@Valid @RequestBody StatusPageComponent statusPageComponent) {
        statusPageService.newStatusPageComponent(statusPageComponent);
        return ResponseEntity.ok(Message.success("Add success"));
    }
    
    @PutMapping("/component")
    @Operation(summary = "Update Status Page Component")
    public ResponseEntity<Message<Void>> updateStatusPageComponent(@Valid @RequestBody StatusPageComponent statusPageComponent) {
        statusPageService.updateStatusPageComponent(statusPageComponent);
        return ResponseEntity.ok(Message.success("Update success"));
    }
    
    @DeleteMapping("/component/{id}")
    @Operation(summary = "Delete Status Page Component")
    public ResponseEntity<Message<Void>> deleteStatusPageComponent(@PathVariable("id") final long id) {
        statusPageService.deleteStatusPageComponent(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }
    
    @GetMapping("/component/{id}")
    @Operation(summary = "Query Status Page Component")
    public ResponseEntity<Message<StatusPageComponent>> queryStatusPageComponent(@PathVariable("id") final long id) {
        StatusPageComponent statusPageComponent = statusPageService.queryStatusPageComponent(id);
        return ResponseEntity.ok(Message.success(statusPageComponent));
    }

    @PostMapping("/incident")
    @Operation(summary = "Save Status Page Incident")
    public ResponseEntity<Message<Void>> newStatusPageIncident(@Valid @RequestBody StatusPageIncident incident) {
        statusPageService.newStatusPageIncident(incident);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping("/incident")
    @Operation(summary = "Update Status Page Incident")
    public ResponseEntity<Message<Void>> updateStatusPageIncident(@Valid @RequestBody StatusPageIncident incident) {
        statusPageService.updateStatusPageIncident(incident);
        return ResponseEntity.ok(Message.success("Update success"));
    }

    @DeleteMapping("/incident/{id}")
    @Operation(summary = "Delete Status Page Incident")
    public ResponseEntity<Message<Void>> deleteStatusPageIncident(@PathVariable("id") final long id) {
        statusPageService.deleteStatusPageIncident(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping("/incident/{id}")
    @Operation(summary = "Get Status Page Incident")
    public ResponseEntity<Message<StatusPageIncident>> queryStatusPageIncident(@PathVariable("id") final long id) {
        StatusPageIncident incident = statusPageService.queryStatusPageIncident(id);
        return ResponseEntity.ok(Message.success(incident));
    }

    @GetMapping("/incident")
    @Operation(summary = "Query Status Page Incidents")
    public ResponseEntity<Message<List<StatusPageIncident>>> queryStatusPageIncident() {
        List<StatusPageIncident> incidents = statusPageService.queryStatusPageIncidents();
        return ResponseEntity.ok(Message.success(incidents));
    }
}
