package org.apache.hertzbeat.manager.pojo.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ai message
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIMessage {
    /**
     * role
     */
    private String role;

    /**
     * content
     */
    private String content;
}
