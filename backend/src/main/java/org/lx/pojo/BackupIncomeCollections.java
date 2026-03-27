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
@TableName("backup_income_collections")
@ApiModel(value = "BackupIncomeCollections对象", description = "收入收款记录备份表")
public class BackupIncomeCollections implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始收款记录ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "收入记录ID")
    @TableField("income_record_id")
    private String incomeRecordId;

    @ApiModelProperty(value = "收款金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "收款日期")
    @TableField("collection_date")
    private LocalDate collectionDate;  // 改为 LocalDate 类型

    @ApiModelProperty(value = "收款方式")
    @TableField("payment_method")
    private String paymentMethod;

    @ApiModelProperty(value = "收款前剩余金额")
    @TableField("before_amount")
    private BigDecimal beforeAmount;

    @ApiModelProperty(value = "收款后剩余金额")
    @TableField("after_amount")
    private BigDecimal afterAmount;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;
}