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
 * 生意记账备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_business_records")
@ApiModel(value="BackupBusinessRecords对象", description="生意记账备份表")
public class BackupBusinessRecords implements Serializable {

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

    @ApiModelProperty(value = "类型: 收入/支出")
    private String type;

    @ApiModelProperty(value = "分类")
    private String category;

    @ApiModelProperty(value = "子分类/项目")
    private String subtype;

    @ApiModelProperty(value = "收入来源")
    private String source;

    @ApiModelProperty(value = "金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "记录日期")
    @TableField("record_date")
    private LocalDate recordDate;

    @ApiModelProperty(value = "支付/收款方式")
    @TableField("payment_method")
    private String paymentMethod;

    @ApiModelProperty(value = "供应商")
    private String supplier;

    @ApiModelProperty(value = "客户名称")
    @TableField("customer_name")
    private String customerName;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
