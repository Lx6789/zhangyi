package org.lx.pojo;

import java.math.BigDecimal;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import java.time.LocalDate;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 日常记账表
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("daily_records")
@ApiModel(value="DailyRecords对象", description="日常记账表")
public class DailyRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "日常记账ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "类型：income-收入，expense-支出")
    private String type;

    @ApiModelProperty(value = "分类（饮食、交通、购物等）")
    private String category;

    @ApiModelProperty(value = "金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "描述")
    private String description;

    @ApiModelProperty(value = "记账日期")
    @TableField("record_date")
    private LocalDate recordDate;

    @ApiModelProperty(value = "支付方式")
    @TableField("payment_method")
    private String paymentMethod;

    @TableField("created_at")
    private LocalDateTime createdAt;


}
