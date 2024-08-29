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
@Table(name = "user")
public class User implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    @Schema(description = "Username, can be repeated, can be modified")
    private String name;

    @Column(nullable = false)
    @Schema(description = "Email, can be modified, used for user login")
    private String email;

    @Column(nullable = false,name = "create_time")
    private String createTime;

    @Column(nullable = false,name = "log_off_time")
    @Schema(description = "Logout time, if not logged out it is 0, if logged out it is time")
    private String logOffTime;


}
