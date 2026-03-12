package org.lx.pojo.dto;

import com.baomidou.mybatisplus.annotation.TableField;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * @Title: SavingsGroupDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/4 19:19
 * @Description: 多人存钱接收类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="SavingsGroupDTO对象", description="多人存钱接收类")
public class SavingsGroupDTO {

    @ApiModelProperty(value = "当前已存总金额")
    @TableField("current_amount")
    private BigDecimal currentAmount;

    @ApiModelProperty(value = "截止日期")
    private LocalDate deadline;

    @ApiModelProperty(value = "详细描述")
    private String description;

}
