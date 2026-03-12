package org.lx.pojo.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Value;
import lombok.experimental.Accessors;

/**
 * @Title: FriendDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/5 19:40
 * @Description: 好友接收类
 */
@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="FriendDTO对象", description="好友接收类")
public class FriendDTO {

    @ApiModelProperty(value = "对方手机号")
    private String phone;

    @ApiModelProperty(value = "留言")
    private String message;
}
