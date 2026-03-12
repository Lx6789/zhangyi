package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Title: CaptchaDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/1/15 21:39
 * @Description: 验证码接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="CaptchaDTO对象", description="验证码接收类")
public class CaptchaDTO {

    @ApiModelProperty(value = "验证码key")
    String key;
    @ApiModelProperty(value = "验证码")
    String code;
}
