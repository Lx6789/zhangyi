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
 * 存钱记录表 - 存储每次存钱的详细历史记录
 * </p>
 *
 * @author lx
 * @since 2026-03-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("saving_deposit_records")
@ApiModel(value="SavingDepositRecords对象", description="存钱记录表 - 存储每次存钱的详细历史记录")
public class SavingDepositRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "存钱记录ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "多人存钱计划ID，外键关联group_savings表")
    @TableField("group_saving_id")
    private Integer groupSavingId;

    @ApiModelProperty(value = "成员记录ID，外键关联savings_members表")
    @TableField("member_id")
    private Integer memberId;

    @ApiModelProperty(value = "用户ID，外键关联users表")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "成员名称（冗余存储，防止成员信息变更）")
    @TableField("member_name")
    private String memberName;

    @ApiModelProperty(value = "本次存入金额")
    @TableField("amount")
    private BigDecimal amount;

    @ApiModelProperty(value = "存入前该成员总金额")
    @TableField("before_amount")
    private BigDecimal beforeAmount;

    @ApiModelProperty(value = "存入后该成员总金额")
    @TableField("after_amount")
    private BigDecimal afterAmount;

    @ApiModelProperty(value = "存入前计划总金额")
    @TableField("plan_before_amount")
    private BigDecimal planBeforeAmount;

    @ApiModelProperty(value = "存入后计划总金额")
    @TableField("plan_after_amount")
    private BigDecimal planAfterAmount;

    @ApiModelProperty(value = "备注信息")
    @TableField("note")
    private String note;

    @ApiModelProperty(value = "存入时间")
    @TableField(value = "deposit_time", fill = FieldFill.INSERT)
    private LocalDateTime depositTime;

    @ApiModelProperty(value = "软删除使用")
    @TableLogic
    @TableField("deleted")
    private Integer deleted;  // 0-未删除，1-已删除

    @ApiModelProperty(value = "软删除时间")
    @TableField(value = "deleted_at", fill = FieldFill.UPDATE)
    private LocalDateTime deletedAt;
}
