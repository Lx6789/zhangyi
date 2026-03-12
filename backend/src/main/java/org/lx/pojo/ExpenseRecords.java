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
 * 支出记录表 - 存储生意算盘中的支出记账记录
 * </p>
 *
 * @author lx
 * @since 2026-01-16
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("expense_records")
@ApiModel(value="ExpenseRecords对象", description="支出记录表 - 存储生意算盘中的支出记账记录")
public class ExpenseRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "支出记录ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "用户ID，外键关联users表")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "支出类型（如：农资投入、人工费用、机械/工具等）")
    private String type;

    @ApiModelProperty(value = "具体项目（如：种子/树苗、化肥、农药等）")
    private String subtype;

    @ApiModelProperty(value = "支出金额，保留两位小数")
    private BigDecimal amount;

    @ApiModelProperty(value = "交易日期")
    @TableField("transaction_date")
    private LocalDate transactionDate;

    @ApiModelProperty(value = "供应商/收款人")
    private String supplier;

    @ApiModelProperty(value = "备注信息")
    private String note;

    @ApiModelProperty(value = "收据照片URL")
    @TableField("receipt_url")
    private String receiptUrl;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "记录类型：business-生意支出，daily-日常支出")
    @TableField("record_type")
    private String recordType;


}
