package org.apache.hertzbeat.templatehub.service;

import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface VersionService {

    boolean insertVersion(Version version, Template template);

    ResponseEntity<Message<List<Version>>> getVersions(int templateId);

    ResponseEntity<Message<Object>> upload(TemplateDto templateDto, MultipartFile file);

    Version getVersion(int versionId);
}
