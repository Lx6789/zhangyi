package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.annotations.ApiOperation;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Title: RegisterDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/1/15 22:22
 * @Description: 注册接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="RegisterDTO对象", description="登录接收类")
public class RegisterDTO {

    @ApiModelProperty(value = "验证码")
    private String captchaCode;

    @ApiModelProperty(value = "验证码key")
    private String captchaKey;

    @ApiModelProperty(value = "密码")
    private String password;

    @ApiModelProperty(value = "电话号码")
    private String phone;

    @ApiModelProperty(value = "安全问题字段")
    private String securityQuestion;

    @ApiModelProperty(value = "安全问题答案的")
    private String securityAnswer;
}
