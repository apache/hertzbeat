package org.apache.hertzbeat.templatehub.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.apache.hertzbeat.templatehub.service.TemplateTagService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;

@Slf4j
@RestController
@RequestMapping("templateTag")
public class TemplateTagController {

    @Autowired
    private TemplateTagService  templateTagService;
}
