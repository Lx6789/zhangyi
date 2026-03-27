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
 * 备份记录表
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("backup_records")
@ApiModel(value="BackupRecords对象", description="备份记录表")
public class BackupRecords implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "备份记录ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "备份唯一标识，格式: backup_YYYYMMDD_HHMMSS_userId")
    @TableField("backup_id")
    private String backupId;

    @ApiModelProperty(value = "用户ID")
    @TableField("user_id")
    private Long userId;

    @ApiModelProperty(value = "备份时间")
    @TableField("backup_time")
    private LocalDateTime backupTime;

    @ApiModelProperty(value = "备份类型: full-全量, incremental-增量")
    @TableField("backup_type")
    private String backupType;

    @ApiModelProperty(value = "数据大小(字节)")
    @TableField("data_size")
    private Long dataSize;

    @ApiModelProperty(value = "数据总条数")
    @TableField("data_count")
    private Integer dataCount;

    @ApiModelProperty(value = "包含的数据类型列表")
    @TableField("data_types")
    private String dataTypes;

    @ApiModelProperty(value = "备份备注")
    private String note;

    @ApiModelProperty(value = "状态: 1-有效, 0-已删除")
    private Integer status;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间")
    @TableField("updated_at")
    private LocalDateTime updatedAt;


}
