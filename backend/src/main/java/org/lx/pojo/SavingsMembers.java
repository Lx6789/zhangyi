package org.lx.pojo;

import java.math.BigDecimal;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDateTime;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 存钱计划成员表 - 存储多人存钱计划的成员信息
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("savings_members")
@ApiModel(value="SavingsMembers对象", description="存钱计划成员表 - 存储多人存钱计划的成员信息")
public class SavingsMembers implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "成员记录ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "多人存钱计划ID，外键关联group_savings表")
    @TableField("group_saving_id")
    private Integer groupSavingId;

    @ApiModelProperty(value = "用户ID，外键关联users表")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "成员显示名称")
    @TableField("member_name")
    private String memberName;

    @ApiModelProperty(value = "该成员已存金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "是否为计划创建者/所有者，默认不是")
    @TableField("is_owner")
    private Boolean isOwner;

    @ApiModelProperty(value = "加入时间")
    @TableField(value = "joined_at", fill = FieldFill.INSERT)
    private LocalDateTime joinedAt;

    @ApiModelProperty(value = "跟新时间")
    @TableField(value = "update_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateAt;

    @ApiModelProperty(value = "是否退出")
    @TableField("deleted")
    @TableLogic
    private Integer deleted;

    @ApiModelProperty(value = "退出时间")
    @TableField(value = "deleted_at", fill = FieldFill.UPDATE)
    private LocalDateTime deletedAt;
}
