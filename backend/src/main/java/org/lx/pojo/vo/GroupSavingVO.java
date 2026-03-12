package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Value;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * @Title: GroupSavingVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/6 16:04
 * @Description: 多人存钱响应类
 */

@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="GroupSavingVO", description="多人存钱响应类")
public class GroupSavingVO {
    @ApiModelProperty(value = "计划id")
    private Integer id;
    @ApiModelProperty(value = "计划名称")
    private String name;
    @ApiModelProperty(value = "描述")
    private String description;
    @ApiModelProperty(value = "存钱理由")
    private String reason;
    @ApiModelProperty(value = "目标金额")
    private BigDecimal targetAmount;
    @ApiModelProperty(value = "当前已存金额")
    private BigDecimal currentAmount;
    @ApiModelProperty(value = "截至日期")
    private LocalDate deadline;
    @ApiModelProperty(value = "存钱类型")
    private String type;
    @ApiModelProperty(value = "完成进度")
    private Integer progress;
    @ApiModelProperty(value = "状态")
    private String status;            // 状态：active/completed/cancelled
    @ApiModelProperty(value = "创建者id")
    private Integer creatorId;
    @ApiModelProperty(value = "创建者姓名")
    private String creatorName;
    @ApiModelProperty(value = "创建时间")
    private LocalDateTime createTime;
    @ApiModelProperty(value = "修改时间")
    private LocalDateTime updateTime;
    @ApiModelProperty(value = "成员列表")
    private List<GroupSavingMemberVO> members;
    @ApiModelProperty(value = "是否已删除(0-未删除 1-已删除)")
    private Integer deleted;
    @ApiModelProperty(value = "删除时间")
    private LocalDateTime deletedAt;
}
