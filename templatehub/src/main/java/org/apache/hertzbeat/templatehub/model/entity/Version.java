package org.apache.hertzbeat.templatehub.model.entity;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Entity
@Table(name = "version")
public class Version implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    @Schema(description = "template id")
    private Integer template;

    @Column(nullable = false)
    @Schema(description = "Version name, modification is not allowed")
    private String version;


    //todo expanded to markdown file address
    @Column(nullable = false)
    @Schema(description = "Version description")
    private String description;

    @Column(nullable = false)
    private Integer download;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false,name = "create_time")
    private String createTime;

    @Column(nullable = false,name = "off_shelf")
    private Integer offShelf;

    @Column(nullable = false,name = "is_del")
    private Integer isDel;


}
