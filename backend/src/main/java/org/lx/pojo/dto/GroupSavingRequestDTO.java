package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * @Title: CreateGroupSavingRequestDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/6 13:49
 * @Description: 创建多人存钱计划接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="CreateGroupSavingRequestDTO对象", description="创建多人存钱计划接收类")
public class GroupSavingRequestDTO {

    @ApiModelProperty(value = "存钱计划名字")
    private String name;
    @ApiModelProperty(value = "存钱计划描述")
    private String description;
    @ApiModelProperty(value = "存钱计划理由")
    private String reason;

    @ApiModelProperty(value = "目标金额")
    private BigDecimal targetAmount;
    @ApiModelProperty(value = "已存金额")
    private BigDecimal currentAmount;

    @ApiModelProperty(value = "截止时间")
    private LocalDate deadline;

    @ApiModelProperty(value = "存钱类型")
    private String type;

    @ApiModelProperty(value = "成员信息")
    private List<GroupSavingMemberRequestDTO> members;
}
