package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * @Title: ToFriendRequests
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/5 18:55
 * @Description: 发送信息的显示
 */

@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="ToFriendRequestVO对象", description="获取发送申请显示类")
public class SentFriendRequestVO {

    @ApiModelProperty(value = "发送ID，主键，自增")
    private Integer id;

    @ApiModelProperty(value = "发送人ID，外键关联users表的id")
    private Integer toUserId;

    @ApiModelProperty(value = "发送人的电话")
    private String toUserPhone;

    @ApiModelProperty(value = "发送人的昵称")
    private String toUserNickname;

    @ApiModelProperty(value = "发送人的头像路径")
    private String toUserAvatar;

    @ApiModelProperty(value = "发送人的信息")
    private String message;

    @ApiModelProperty(value = "发送状态")
    private Integer status;

    @ApiModelProperty(value = "发送时间")
    private LocalDateTime createTime;
}
