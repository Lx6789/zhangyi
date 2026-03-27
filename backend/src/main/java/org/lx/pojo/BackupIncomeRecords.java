package org.lx.pojo;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_income_records")
@ApiModel(value = "BackupIncomeRecords对象", description = "收入记录备份表")
public class BackupIncomeRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始记录ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "日期")
    private LocalDate date;

    @ApiModelProperty(value = "分类")
    private String category;

    @ApiModelProperty(value = "子分类")
    private String subcategory;

    @ApiModelProperty(value = "来源")
    private String source;

    @ApiModelProperty(value = "商品名称")
    @TableField("product_name")
    private String productName;

    @ApiModelProperty(value = "数量")
    private BigDecimal quantity;

    @ApiModelProperty(value = "单位")
    private String unit;

    @ApiModelProperty(value = "单价")
    private BigDecimal price;

    @ApiModelProperty(value = "收款方式")
    @TableField("payment_method")
    private String paymentMethod;

    @ApiModelProperty(value = "业务类型: personal/business")
    @TableField("business_type")
    private String businessType;

    @ApiModelProperty(value = "客户ID")
    @TableField("customer_id")
    private String customerId;

    @ApiModelProperty(value = "客户名称")
    @TableField("customer_name")
    private String customerName;

    @ApiModelProperty(value = "已收金额")
    @TableField("collected_amount")
    private BigDecimal collectedAmount;

    @ApiModelProperty(value = "是否已收清")
    @TableField("is_collected")
    private Boolean isCollected;  // 改为 Boolean 类型

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;
}