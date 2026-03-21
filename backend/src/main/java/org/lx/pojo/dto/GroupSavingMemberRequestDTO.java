package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Value;

import java.math.BigDecimal;

/**
 * @Title: GroupSavingMemberRequestDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/6 13:50
 * @Description: 创建多人存钱成员接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="GroupSavingMemberRequestDTO对象", description="创建多人存钱成员接收类")
public class GroupSavingMemberRequestDTO {

    @ApiModelProperty(value = "成员姓名")
    private String memberName;
    @ApiModelProperty(value = "已存金额")
    private BigDecimal amount;
    @ApiModelProperty(value = "用户id")
    private Integer userId;
    @ApiModelProperty(value = "是否为创建者")
    private Boolean isCreator;
    @ApiModelProperty(value = "是否被删除")
    private Integer deleted;
}
