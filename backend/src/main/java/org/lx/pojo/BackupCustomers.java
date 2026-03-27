package org.lx.pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import org.lx.config.JsonObjectToStringDeserializer;

/**
 * <p>
 * 客户管理备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_customers")
@ApiModel(value="BackupCustomers对象", description="客户管理备份表")
public class BackupCustomers implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始客户ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "客户名称")
    private String name;

    @ApiModelProperty(value = "客户类型: 零售客户/批发客户/VIP客户")
    private String type;

    @ApiModelProperty(value = "联系电话")
    private String phone;

    @ApiModelProperty(value = "地址")
    private String address;

    @ApiModelProperty(value = "赊账信息: {hasCredit, balance, creditLimit, settlementDays}")
    @TableField("credit_info")
    @JsonDeserialize(using = JsonObjectToStringDeserializer.class)  // 添加自定义反序列化器
    private String creditInfo;  // 保持 String 类型

    @ApiModelProperty(value = "统计信息: {transactionCount, totalAmount, lastTransactionDate}")
    @JsonDeserialize(using = JsonObjectToStringDeserializer.class)  // 添加自定义反序列化器
    private String stats;  // 保持 String 类型

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;
}