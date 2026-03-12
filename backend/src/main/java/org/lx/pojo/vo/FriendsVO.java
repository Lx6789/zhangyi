package org.lx.pojo.vo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * @Title: FriendsVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/4 21:28
 * @Description: 好友显示数据
 */
@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="FriendVO对象", description="好友显示数据")
public class FriendsVO {

    @ApiModelProperty(value = "好友关系ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "好友ID，外键关联users表")
    @TableField("friend_id")
    private Integer friendId;

    @ApiModelProperty(value = "好友电话")
    private String phone;

    @ApiModelProperty(value = "好友名称")
    private String nickname;

    @ApiModelProperty(value = "头像URL")
    private String avatar;

    @ApiModelProperty(value = "添加好友时间")
    private LocalDateTime addTime;


}
