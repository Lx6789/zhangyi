package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Title: LoginVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/1/9 17:39
 * @Description: 登录返回类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="LoginVO对象", description="登录返回类")
public class LoginVO {

    @ApiModelProperty(value = "用户ID，主键，自增")
    private Integer id;
    @ApiModelProperty(value = "用户名")
    private String username;
    @ApiModelProperty(value = "手机号")
    private String phone;
    @ApiModelProperty(value = "邮箱")
    private String email;
    @ApiModelProperty(value = "头像url")
    private String avatar;
    @ApiModelProperty(value = "头像url")
    private String securityQuestion;
}
