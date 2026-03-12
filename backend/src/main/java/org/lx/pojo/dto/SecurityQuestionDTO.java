package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Title: SecurityQuestionDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/2/3 22:15
 * @Description: 安全问题接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="SecurityQuestionDTO对象", description="安全问题接收类")
public class SecurityQuestionDTO {

    @ApiModelProperty(value = "验证码")
    private String captchaCode;

    @ApiModelProperty(value = "验证码key")
    private String captchaKey;

    @ApiModelProperty(value = "电话号码")
    private String phone;

    @ApiModelProperty(value = "安全问题的回答")
    private String securityAnswer;

    @ApiModelProperty(value = "新密码")
    private String newPassword;
}
