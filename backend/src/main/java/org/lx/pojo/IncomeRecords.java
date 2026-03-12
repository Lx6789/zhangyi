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
 * 收入记录表 - 存储生意算盘中的收入记账记录
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("income_records")
@ApiModel(value="IncomeRecords对象", description="收入记录表 - 存储生意算盘中的收入记账记录")
public class IncomeRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "收入记录ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "用户ID，外键关联users表")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "收入品类（如：苹果、梨、桃子等）")
    private String category;

    @ApiModelProperty(value = "销售渠道（如：零售、批发、电商等）")
    private String channel;

    @ApiModelProperty(value = "客户/批发商名称")
    private String customer;

    @ApiModelProperty(value = "数量（斤），保留两位小数")
    private BigDecimal quantity;

    @ApiModelProperty(value = "单价（元/斤），保留两位小数")
    private BigDecimal price;

    @ApiModelProperty(value = "总金额，quantity * price，保留两位小数")
    private BigDecimal amount;

    @ApiModelProperty(value = "收款方式（现金、微信、支付宝、银行卡）")
    @TableField("payment_method")
    private String paymentMethod;

    @ApiModelProperty(value = "交易日期")
    @TableField("transaction_date")
    private LocalDate transactionDate;

    @ApiModelProperty(value = "备注信息")
    private String note;

    @ApiModelProperty(value = "凭证照片URL")
    @TableField("photo_url")
    private String photoUrl;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "记录类型：business-生意收入，daily-日常收入")
    @TableField("record_type")
    private String recordType;


}
