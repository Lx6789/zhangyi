package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * @Title: DailyRecordsVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/1/16 16:04
 * @Description: 消费数据返回类
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value = "DailyRecordsVO对象", description = "今日消费数据返回类")
public class DailyRecordsVO {

    @ApiModelProperty(value = "收入")
    private BigDecimal income;
    @ApiModelProperty(value = "支出")
    private BigDecimal expense;
}
