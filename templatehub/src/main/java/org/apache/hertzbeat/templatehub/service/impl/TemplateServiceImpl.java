package org.apache.hertzbeat.templatehub.service.impl;

import org.apache.hertzbeat.templatehub.model.dao.TemplateDao;
import org.apache.hertzbeat.templatehub.model.dao.VersionDao;
import org.apache.hertzbeat.templatehub.model.dto.Message;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Template;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.FileStorageService;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;

import static org.apache.hertzbeat.templatehub.constants.CommonConstants.FAIL_CODE;

@Slf4j
@Service
public class TemplateServiceImpl implements TemplateService {

//    @Autowired
//    MinIOConfigService minIOConfigService;

    @Autowired
    VersionService versionService;

    @Autowired
    TemplateDao templateDao;

    @Autowired
    VersionDao versionDao;

    private final FileStorageService fileStorageService;

    @Autowired
    public TemplateServiceImpl(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    @Override
    public ResponseEntity<Message<Object>> upload(TemplateDto templateDto, MultipartFile file) {

        if(templateDto.getUserId()==0||templateDto.getName().isEmpty()||templateDto.getCurrentVersion().isEmpty()){
            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template description information is missing"));
        }

        //Generate Template entity
        Template template=new Template();
        template.setId(0);
        template.setName(templateDto.getName());
        template.setDescription(templateDto.getDescription());
        template.setLatest(0);
        template.setUser(templateDto.getUserId());
        template.setCategory(templateDto.getCategoryId());
        template.setTag(0);
        template.setDownload(0);
        template.setCreateTime(templateDto.getCreate_time());
        template.setUpdateTime(templateDto.getUpdate_time());
        template.setOffShelf(0);
        template.setIsDel(0);

        //Generate version entity
        Version version=new Version();
        version.setId(0);
        version.setVersion(templateDto.getCurrentVersion());
        version.setDescription(templateDto.getDescriptionVersion());
        version.setDownload(0);
        version.setCreateTime(templateDto.getCreate_time());
        version.setOffShelf(0);
        version.setIsDel(0);

        //Check if the same user already has a configuration with the same name
        int count = templateDao.queryCountByNameAndUser(template.getName(), template.getUser());
        //If there is already template data with the same name, consider whether to add new version data
        if(count>=1){
            int id = templateDao.queryId(template.getName(), template.getUser());
            template.setId(id);
            //Check the version table of this template to see if there are any duplicate versions
            int versionCount = versionDao.queryCountByTemplateAndVersion(id, templateDto.getCurrentVersion());
            if(versionCount>=1){
                return ResponseEntity.ok(Message.fail(FAIL_CODE,"You already have a template with the same name and version number"));
            }
        }else{  //If there is no template data with the same name, add template data first and then consider whether to add version data
            Template templateNew = templateDao.save(template);
            if(templateNew.getId()==0){
//                return ResponseEntity.ok(Message.fail(FAIL_CODE,"Template data insertion error"));
                throw new RuntimeException("Template data insertion error");
            }
        }

        //Insert version information
        boolean isInsertVersion = versionService.insertVersion(version, template);

        if(!isInsertVersion){
//            return ResponseEntity.ok(Message.fail(FAIL_CODE,"Version information insertion error"));
            throw new RuntimeException("Version information insertion error");
        }

        // Build the storage path of the file in MinIO, path=user id/template id/version number. yml
        String path=templateDto.getUserId()+"/"+template.getId();

        try {
//            minIOConfigService.uploadFile(file,path);
            fileStorageService.uploadFile(file, path, templateDto.getCurrentVersion()+".yml");
        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        }

        return ResponseEntity.ok(Message.success());
    }

    @Override
    public ResponseEntity<Message<List<Template>>> getAllTemplatesByUserId(int userId) {

        // Query all templates of a user that have not been deleted
        List<Template> templates = templateDao.queryByUserId(userId, 0);

        return ResponseEntity.ok(Message.success(templates));
    }

    @Override
    public ResponseEntity<Message<List<Template>>> getAllTemplates() {

        // Query all templates that have not been deleted
        List<Template> templates = templateDao.queryAllByIsDel(0);

        return ResponseEntity.ok(Message.success(templates));
    }

    /**
     * Download the template, generate an external link and send it to the frontend
     *
     * @param version version Name
     */
    @Override
    public ResponseEntity<Resource> downloadTemplate(int ownerId, int templateId, String version) {

        if(templateId==0|| Objects.equals(version, "") ||ownerId==0){
            throw new IllegalArgumentException("id error");
        }

        String path=ownerId+"/"+templateId;
        String fileName=version+".yml";

        Resource file = fileStorageService.downloadFile(path, fileName);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(file);
    }

    @Override
    public ResponseEntity<Message<String>> deleteTemplate(int ownerId, int templateId, String version) {
        //todo Perform database operations

        String path=ownerId+"/"+templateId;
        fileStorageService.deleteFile(path,version+".yml");
        return null;
    }

    @Override
    public Template getTemplate(int templateId) {
        return templateDao.findTemplateById(templateId);
    }
}
