package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Title: LoginDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo
 * @Date: 2026/1/8 23:39
 * @Description: 登录接收类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="LoginDTO对象", description="登录接收类")
public class LoginDTO {

    @ApiModelProperty(value = "标识符")
    private String identifier;

    @ApiModelProperty(value = "密码")
    private String password;

    @ApiModelProperty(value = "是否记住")
    private boolean rememberMe;
}
