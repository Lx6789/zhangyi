package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Title: SavingGroupLeaveDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/7 19:19
 * @Description: 退出多人存钱计划接收类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="SavingGroupLeaveDTO对象", description="退出多人存钱计划接收类")
public class SavingGroupLeaveDTO {

    @ApiModelProperty(value = "是否是创建者")
    private boolean isCreator;

    @ApiModelProperty(value = "新的创建者id")
    private Integer newCreatorId;
}
