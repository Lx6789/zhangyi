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
 * 个人存钱计划备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_personal_savings")
@ApiModel(value="BackupPersonalSavings对象", description="个人存钱计划备份表")
public class BackupPersonalSavings implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始计划ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "计划名称")
    private String name;

    @ApiModelProperty(value = "计划类型")
    private String type;

    @ApiModelProperty(value = "目标金额")
    @TableField("target_amount")
    private BigDecimal targetAmount;

    @ApiModelProperty(value = "已存金额")
    @TableField("current_amount")
    private BigDecimal currentAmount;

    @ApiModelProperty(value = "截止日期")
    private LocalDate deadline;

    @ApiModelProperty(value = "状态: active-进行中, completed-已完成, expired-已过期")
    private String status;

    @ApiModelProperty(value = "主题颜色")
    private String color;

    @ApiModelProperty(value = "图标")
    private String icon;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "是否删除: 0-否, 1-是")
    private Integer deleted;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
