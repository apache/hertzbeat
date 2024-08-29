package org.apache.hertzbeat.templatehub.service;

import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TemplateService {

    ResponseEntity<Message<Object>> upload(TemplateDto templateDto, MultipartFile file);

    ResponseEntity<Message<List<Template>>> getAllTemplatesByUserId(int userId);

    ResponseEntity<Message<List<Template>>> getAllTemplates();

    ResponseEntity<Resource> downloadTemplate(int ownerId, int templateId, String version);

    ResponseEntity<Message<String>> deleteTemplate(int ownerId, int templateId, String version);

    Template getTemplate(int templateId);
}
