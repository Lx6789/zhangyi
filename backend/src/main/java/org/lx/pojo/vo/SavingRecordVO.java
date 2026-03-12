package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.math.BigDecimal;

/**
 * @Title: SavingRecordVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/8 12:12
 * @Description:
 */

@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="SavingRecordVO对象", description="")
public class SavingRecordVO {

    @ApiModelProperty(value = "记录id")
    private Integer id;
    @ApiModelProperty(value = "计划id")
    private Integer planId;
    @ApiModelProperty(value = "成员id")
    private Integer memberId;
    @ApiModelProperty(value = "成员名称")
    private String memberName;
    @ApiModelProperty(value = "存入金额")
    private BigDecimal amount;
    @ApiModelProperty(value = "备注")
    private String note;
    @ApiModelProperty(value = "存入时间")
    private String createTime;
}
