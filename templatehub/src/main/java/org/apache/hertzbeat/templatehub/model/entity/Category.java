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
@Table(name = "category")
public class Category implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    @Schema(description = "Category Name")
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false,name = "create_time")
    private byte[] createTime;

    @Column(nullable = false, name = "update_time")
    private String updateTime;

    @Column(nullable = false,name = "is_del")
    @Schema(description = "Delete Mark")
    private Integer isDel;


}
