package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

/**
 * @Title: BackupDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/27 12:05
 * @Description: 备份接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="BackupDTO对象", description="备份接收类")
public class BackupDTO {

    @ApiModelProperty(value = "用户ID")
    private Long userId;  // 改为 Long 类型

    @ApiModelProperty(value = "备份时间")
    private String backupTime;

    @ApiModelProperty(value = "数据大小")
    private BigInteger dataSize;

    @ApiModelProperty(value = "数据类型列表")
    private List<String> dataTypes;  // 改为 List<String> 类型

    @ApiModelProperty(value = "备份备注")
    private String note;

    @ApiModelProperty(value = "备份的具体数据内容 ")
    private BackupDataDTO data;
}