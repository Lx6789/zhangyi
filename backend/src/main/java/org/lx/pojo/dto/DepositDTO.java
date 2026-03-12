package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * @Title: DepositDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/7 11:44
 * @Description: 存款接收类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="DepositDTO对象", description="存款接收类")
public class DepositDTO {

    @ApiModelProperty(value = "成员id")
    private Integer memberId;

    @ApiModelProperty(value = "存入金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "备注")
    private String note;
}
