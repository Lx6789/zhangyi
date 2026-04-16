package org.lx.pojo;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;

import java.util.Date;

/**
 * @Title: AppVersion
 * @Author: MrLu2
 * @Package: org.lx.pojo
 * @Date: 2026/4/3 16:25
 * @Description: 版本更新类
 */

@Accessors(chain = true)
@Data
@TableName("app_version")
@ApiModel(value="AppVersion对象", description="版本更新类")
public class AppVersion {

    @TableId(type = IdType.AUTO)
    private Integer id;

    @TableField("version_code")
    @ApiModelProperty(value = "版本号")
    private Integer versionCode;

    @TableField("version_name")
    @ApiModelProperty(value = "版本名称")
    private String versionName;

    @TableField("update_content")
    @ApiModelProperty(value = "更新内容")
    private String updateContent;

    @TableField("download_url")
    @ApiModelProperty("下载地址")
    private String downloadUrl;

    @TableField("is_force_update")
    @ApiModelProperty(value = "是否强制刷新")
    private Boolean isForceUpdate;

    @TableField("md5")
    @ApiModelProperty(value = "文件的md5")
    private String md5;

    @TableField("file_size")
    @ApiModelProperty(value = "文件大小")
    private Long fileSize;

    @TableField("update_time")
    @ApiModelProperty(value = "更新时间")
    private Date updateTime;

    @TableField("create_time")
    @ApiModelProperty(value = "版本创建时间")
    private Date createTime;
}
