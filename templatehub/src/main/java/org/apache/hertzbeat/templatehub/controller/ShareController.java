package org.apache.hertzbeat.templatehub.controller;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.apache.hertzbeat.templatehub.util.Base62Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@RestController
@RequestMapping("share")
@CrossOrigin(origins = "*")
public class ShareController {

    @Autowired
    TemplateService templateService;
    @Autowired
    VersionService versionService;

    @GetMapping("/getShareURL/{version}")
    public ResponseEntity<Message<String>> getShareURL(@PathVariable("version") long versionId){

        if(versionId<=0){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"params error"));
        }

        String base62Key = Base62Util.idToShortKey(versionId+100000000);

        return ResponseEntity.ok(Message.success(base62Key));
    }

    @GetMapping("/share/{key}")
    public ResponseEntity<Resource> downloadShare(@PathVariable("key") String key){

        long versionId = (int) Base62Util.shortKeyToId(key)-100000000;

        Version version = versionService.getVersion((int) versionId);

        Template template = templateService.getTemplate(version.getTemplate());

        return templateService.downloadTemplate(template.getUser(), template.getId(), version.getVersion());
    }
}
