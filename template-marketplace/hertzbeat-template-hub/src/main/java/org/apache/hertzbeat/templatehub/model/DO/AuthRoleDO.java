package org.apache.hertzbeat.templatehub.model.DO;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.Range;

import java.time.LocalDateTime;

/**
 * role entity
 * @author tomsun28
 * @date 00:27 2019-07-27
 */
@Entity
@Table(name = "auth_role")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthRoleDO {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "name can not null")
    @Length(min = 3, max = 100, message = "name length in 3-100")
    private String name;

    @NotBlank(message = "code can not null")
    @Length(min = 3, max = 100, message = "code length in 3-100")
    private String code;

    @Range(min = 0, max = 9, message = "1 enable, 9 disable")
    private Integer status;

    private String description;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtUpdate;
}
