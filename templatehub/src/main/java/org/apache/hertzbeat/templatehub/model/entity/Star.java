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
@Table(name = "star")
@Entity
public class Star implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id",nullable = false)
    private Integer userId;

    @Column(name = "template_id",nullable = false)
    private Integer templateId;

    @Column(name = "create_time",nullable = false)
    private byte[] createTime;

    @Column(name = "is_del",nullable = false)
    @Schema(description = "Cancel flag, 0 means normal, 1 means cancel")
    private Integer isDel;


}
