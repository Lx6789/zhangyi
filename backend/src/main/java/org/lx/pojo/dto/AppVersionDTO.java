package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

/**
 * @Title: AppVersionDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/4/3 16:28
 * @Description: 版本信息接收类
 */

@Data
@ApiModel("版本信息")
public class AppVersionDTO {

    @ApiModelProperty("版本号（数字）")
    private Integer versionCode;

    @ApiModelProperty("版本名称")
    private String versionName;

    @ApiModelProperty("更新内容")
    private String updateContent;

    @ApiModelProperty("是否强制更新")
    private Boolean forceUpdate;

    @ApiModelProperty("更新密码")
    private String updatePassword;
}
