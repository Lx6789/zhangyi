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
 * 供应商管理备份表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_suppliers")
@ApiModel(value="BackupSuppliers对象", description="供应商管理备份表")
public class BackupSuppliers implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private String id;

    @ApiModelProperty(value = "关联的备份ID")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "原始供应商ID")
    @TableField("original_id")
    private String originalId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "供应商名称")
    private String name;

    @ApiModelProperty(value = "联系人")
    @TableField("contact_person")
    private String contactPerson;

    @ApiModelProperty(value = "联系电话")
    private String phone;

    @ApiModelProperty(value = "电子邮箱")
    private String email;

    @ApiModelProperty(value = "供应商类别")
    private String category;

    @ApiModelProperty(value = "地址")
    private String address;

    @ApiModelProperty(value = "结算方式")
    @TableField("payment_terms")
    private String paymentTerms;

    @ApiModelProperty(value = "账期(天)")
    @TableField("payment_days")
    private Integer paymentDays;

    @ApiModelProperty(value = "备注")
    private String note;

    @ApiModelProperty(value = "备份创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
