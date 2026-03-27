package org.lx.pojo;

import java.math.BigDecimal;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import java.time.LocalDate;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import java.util.List;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import org.lx.pojo.dto.PurchaseOrderItemDTO;

/**
 * <p>
 * 采购订单备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_purchase_orders")
@ApiModel(value="BackupPurchaseOrders对象", description="采购订单备份表")
public class BackupPurchaseOrders implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始订单ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "订单号")
    @TableField("order_no")
    private String orderNo;

    @ApiModelProperty(value = "供应商ID")
    @TableField("supplier_id")
    private String supplierId;

    @ApiModelProperty(value = "采购日期")
    @TableField("order_date")
    private LocalDate orderDate;

    @ApiModelProperty(value = "预计送达日期")
    @TableField("expected_date")
    private LocalDate expectedDate;

    @ApiModelProperty(value = "收货日期")
    @TableField("receive_date")
    private LocalDate receiveDate;

    @ApiModelProperty(value = "状态: pending-待处理, completed-已完成, cancelled-已取消")
    private String status;

    @ApiModelProperty(value = "订单总额")
    @TableField("total_amount")
    private BigDecimal totalAmount;

    @ApiModelProperty(value = "商品列表")
    private List<PurchaseOrderItemDTO> items;  // 改为 List 类型

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;
}