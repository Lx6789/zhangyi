package org.lx.pojo;

import java.math.BigDecimal;
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
 * 个人存钱记录备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_personal_saving_records")
@ApiModel(value="BackupPersonalSavingRecords对象", description="个人存钱记录备份表")
public class BackupPersonalSavingRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "关联的计划ID(original_id)")
    @TableField("plan_id")
    private String planId;

    @ApiModelProperty(value = "存入金额")
    private BigDecimal amount;

    @ApiModelProperty(value = "存入时间")
    @TableField("deposit_time")
    private LocalDateTime depositTime;

    @ApiModelProperty(value = "存前金额")
    @TableField("before_amount")
    private BigDecimal beforeAmount;

    @ApiModelProperty(value = "存后金额")
    @TableField("after_amount")
    private BigDecimal afterAmount;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
