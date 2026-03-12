package org.lx.pojo.vo;

import lombok.Data;
import lombok.experimental.Accessors;
import io.swagger.annotations.ApiModelProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Accessors(chain = true)
public class GroupRecordsVO {

    @ApiModelProperty(value = "记录ID")
    private Integer id;

    @ApiModelProperty(value = "计划ID")
    private Integer planId;

    @ApiModelProperty(value = "成员ID")
    private Integer memberId;

    @ApiModelProperty(value = "成员名称")
    private String memberName;

    @ApiModelProperty(value = "存入金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "存入时间")
    private LocalDateTime createTime;

    @ApiModelProperty(value = "是否已删除(0-未删除 1-已删除)")
    private Integer deleted;

    @ApiModelProperty(value = "删除时间")
    private LocalDateTime deletedAt;
}