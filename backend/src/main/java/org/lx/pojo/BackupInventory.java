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
 * 库存管理备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_inventory")
@ApiModel(value="BackupInventory对象", description="库存管理备份表")
public class BackupInventory implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始库存ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "商品ID")
    @TableField("product_id")
    private String productId;

    @ApiModelProperty(value = "商品名称")
    @TableField("product_name")
    private String productName;

    @ApiModelProperty(value = "分类")
    private String category;

    @ApiModelProperty(value = "库存数量")
    private BigDecimal quantity;

    @ApiModelProperty(value = "单位")
    private String unit;

    @ApiModelProperty(value = "成本价")
    @TableField("cost_price")
    private BigDecimal costPrice;

    @ApiModelProperty(value = "售价")
    @TableField("selling_price")
    private BigDecimal sellingPrice;

    @ApiModelProperty(value = "供应商")
    private String supplier;

    @ApiModelProperty(value = "存放位置")
    private String location;

    @ApiModelProperty(value = "最低库存预警")
    @TableField("min_stock")
    private Integer minStock;

    @ApiModelProperty(value = "过期日期")
    @TableField("expiry_date")
    private LocalDate expiryDate;

    @ApiModelProperty(value = "状态: 正常/低库存/已过期")
    private String status;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
