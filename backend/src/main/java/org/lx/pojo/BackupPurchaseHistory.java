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
 * 采购历史备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_purchase_history")
@ApiModel(value="BackupPurchaseHistory对象", description="采购历史备份表")
public class BackupPurchaseHistory implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始历史ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "供应商ID")
    @TableField("supplier_id")
    private String supplierId;

    @ApiModelProperty(value = "订单号")
    @TableField("order_no")
    private String orderNo;

    @ApiModelProperty(value = "商品ID")
    @TableField("product_id")
    private String productId;

    @ApiModelProperty(value = "商品名称")
    @TableField("product_name")
    private String productName;

    @ApiModelProperty(value = "数量")
    private BigDecimal quantity;

    @ApiModelProperty(value = "单位")
    private String unit;

    @ApiModelProperty(value = "单价")
    private BigDecimal price;

    @ApiModelProperty(value = "总额")
    @TableField("total_amount")
    private BigDecimal totalAmount;

    @ApiModelProperty(value = "采购日期")
    @TableField("purchase_date")
    private LocalDate purchaseDate;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
