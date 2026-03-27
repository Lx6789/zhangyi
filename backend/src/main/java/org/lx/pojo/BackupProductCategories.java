package org.lx.pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
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
 * 商品分类备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_product_categories")
@ApiModel(value="BackupProductCategories对象", description="商品分类备份表")
public class BackupProductCategories implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始分类ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "分类名称")
    private String name;

    @ApiModelProperty(value = "图标")
    private String icon;

    @ApiModelProperty(value = "排序")
    @TableField("sort_order")
    private Integer sortOrder;

    @ApiModelProperty(value = "是否默认分类")
    @TableField("is_default")
    private Boolean isDefault;  // 改为 Boolean 类型

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;
}