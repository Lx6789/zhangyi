package org.lx.pojo;

import java.math.BigDecimal;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 多人存钱计划表 - 存储多人参与的存钱计划
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("group_savings")
@ApiModel(value="GroupSavings对象", description="多人存钱计划表 - 存储多人参与的存钱计划")
public class GroupSavings implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "多人存钱计划ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "计划名称")
    private String name;

    @ApiModelProperty(value = "存钱理由/目标描述")
    private String reason;

    @ApiModelProperty(value = "详细描述")
    private String description;

    @ApiModelProperty(value = "总目标金额")
    @TableField("target_amount")
    private BigDecimal targetAmount;

    @ApiModelProperty(value = "当前已存总金额")
    @TableField("current_amount")
    private BigDecimal currentAmount;

    @ApiModelProperty(value = "截止日期")
    private LocalDate deadline;

    @ApiModelProperty(value = "存钱类型")
    private String type;

    @ApiModelProperty(value = "图标类名")
    private String icon;

    @ApiModelProperty(value = "主题色")
    private String color;

    @ApiModelProperty(value = "完成进度百分比")
    private Integer progress;

    @ApiModelProperty(value = "状态：active-进行中，completed-已完成，cancelled-已取消")
    private String status;

    @ApiModelProperty(value = "创建者ID，外键关联users表")
    @TableField("created_by")
    private Integer createdBy;

    @ApiModelProperty(value = "创建时间")
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间")
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @ApiModelProperty(value = "是否删除")
    @TableField(value = "deleted")
    @TableLogic
    private Integer deleted;

    @ApiModelProperty(value = "删除删除时间")
    @TableField(value = "deleted_at", fill = FieldFill.UPDATE)
    private LocalDateTime deletedAt;
}
