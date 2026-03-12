package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.math.BigDecimal;

/**
 * @Title: DepositVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/7 11:47
 * @Description: 存钱响应类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Accessors(chain = true)
@ApiModel(value = "DepositVO对象", description = "存钱返回类")
public class DepositVO {

    @ApiModelProperty(value = "计划id")
    private Integer planId;

    @ApiModelProperty(value = "成员id")
    private Integer memberId;

    @ApiModelProperty(value = "存入金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "该成员新的总金额")
    private BigDecimal memberTotal;

    @ApiModelProperty(value = "计划新的总金额")
    private BigDecimal planTotal;

    @ApiModelProperty(value = "新的进度百分比")
    private Integer progress;
}
