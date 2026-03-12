package org.lx.pojo;

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
 * 好友申请表 - 存储用户之间的好友申请
 * </p>
 *
 * @author lx
 * @since 2026-03-05
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("friend_requests")
@ApiModel(value="FriendRequests对象", description="好友申请表 - 存储用户之间的好友申请")
public class FriendRequests implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "申请ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "申请人ID，外键关联users表的id")
    @TableField("from_user_id")
    private Integer fromUserId;

    @ApiModelProperty(value = "被申请人ID，外键关联users表的id")
    @TableField("to_user_id")
    private Integer toUserId;

    @ApiModelProperty(value = "申请状态：0-待处理，1-已同意，2-已拒绝，3-已忽略")
    private Integer status;

    @ApiModelProperty(value = "申请留言，最多200字")
    private String message;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间")
    @TableField("updated_at")
    private LocalDateTime updatedAt;

    @ApiModelProperty(value = "乐观锁")
    @Version
    private Integer version;


}
