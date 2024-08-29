package org.apache.hertzbeat.templatehub.model.entity;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Entity
@Table(name="template")
public class Template implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    @Schema(description = "Template name, cannot be modified, but can be repeated")
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    @Schema(description = "Latest version id")
    private Integer latest;

    @Column(nullable = false)
    @Schema(description = "user id")
    private Integer user;

    @Column(nullable = false)
    @Schema(description = "Template category id")
    private Integer category;

    @Column(nullable = false)
    @Schema(description = "Template-tag table id")
    private Integer tag;

    @Column(nullable = false)
    @Schema(description = "Downloads")
    private Integer download;

    @Column(nullable = false,name = "create_time")
    private String createTime;

    @Column(nullable = false, name = "update_time")
    private String updateTime;

    @Column(nullable = false,name="off_shelf")
    @Schema(description = "Delisting mark, 0 means normal, 1 means delisting")
    private Integer offShelf;

    @Column(nullable = false,name = "is_del")
    @Schema(description = "Delete mark, 0 means normal, 1 means delete")
    private Integer isDel;
}
