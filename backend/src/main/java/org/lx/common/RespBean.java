package org.lx.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
* @Title: RespBean
* @Author: MrLu2
* @Package: org.lx.common
* @Date: 2026/1/4 18:46
* @Description: 响应类
*/

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RespBean {

    private Integer code;
    private String message;
    private Object data;

    /**
     * 成功响应
     * @param code
     * @param message
     * @param data
     * @return
     */
    public static RespBean success(Integer code, String message, Object data) {
        return new RespBean(code, message, data);
    }

    /**
     * 成功响应
     * @param code
     * @param message
     * @return
     */
    public static RespBean success(Integer code, String message) {
        return new RespBean(code, message, null);
    }

    /**
     * 失败响应
     * @param code
     * @param message
     * @return
     */
    public static RespBean error(Integer code, String message) {
        return new RespBean(code, message, null);
    }

    /**
     * 失败响应
     * @param code
     * @param message
     * @param data
     * @return
     */
    public static RespBean error(Integer code, String message, Object data) {
        return new RespBean(code, message, data);
    }
}
