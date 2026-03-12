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
 * 个人存钱计划表 - 存储用户的个人存钱目标
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("personal_savings")
@ApiModel(value="PersonalSavings对象", description="个人存钱计划表 - 存储用户的个人存钱目标")
public class PersonalSavings implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "个人存钱计划ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "用户ID，外键关联users表")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "存钱计划名称")
    private String name;

    @ApiModelProperty(value = "存钱理由/目标描述")
    private String reason;

    @ApiModelProperty(value = "目标金额，保留两位小数")
    @TableField("target_amount")
    private BigDecimal targetAmount;

    @ApiModelProperty(value = "已存金额，保留两位小数")
    @TableField("current_amount")
    private BigDecimal currentAmount;

    @ApiModelProperty(value = "截止日期")
    private LocalDate deadline;

    @ApiModelProperty(value = "存钱类型（日常储蓄、旅行基金、教育基金等）")
    private String type;

    @ApiModelProperty(value = "完成进度百分比（0-100）")
    private Integer progress;

    @ApiModelProperty(value = "是否已完成，默认未完成")
    private Boolean completed;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间")
    @TableField("updated_at")
    private LocalDateTime updatedAt;


}
