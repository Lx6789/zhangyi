package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * @Title: FriendRequestVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/5 15:12
 * @Description: 获取好友申请显示类
 */

@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="FriendRequestVO对象", description="获取好友申请显示类")
public class ReceivedFriendRequestVO {

    @ApiModelProperty(value = "申请ID，主键，自增")
    private Integer id;

    @ApiModelProperty(value = "申请人ID，外键关联users表的id")
    private Integer fromUserId;

    @ApiModelProperty(value = "申请人的电话")
    private String fromUserPhone;

    @ApiModelProperty(value = "申请人的昵称")
    private String fromUserNickname;

    @ApiModelProperty(value = "申请人的头像路径")
    private String fromUserAvatar;

    @ApiModelProperty(value = "申请人的信息")
    private String message;

    @ApiModelProperty(value = "申请状态")
    private Integer status;

    @ApiModelProperty(value = "申请时间")
    private LocalDateTime createTime;
}
