package org.apache.hertzbeat.templatehub.model.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Data
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class TemplateDto {

    private int id=0;
    private String name="";
    private String description="";
    private String descriptionVersion="";
    private String latest="";  //Latest version
    private List<String> versions=new ArrayList<>();  //Version list
    private String currentVersion="";  //Current version number
    private String user="";    //userName
    private int userId=0;
    private String category="";    //Template Category
    private int categoryId=0;
    private int download=0;   //Number of downloads
    private String create_time="";
    private String update_time="";
    private int off_shelf=0;
    private int is_del=0;
//    private int[] tagId;    //Tag information, ignore it for now
}
