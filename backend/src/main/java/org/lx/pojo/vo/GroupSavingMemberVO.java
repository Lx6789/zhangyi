package org.lx.pojo.vo;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * @Title: GroupSavingMemberVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/6 16:05
 * @Description: 多人存钱成员响应类
 */

@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="GroupSavingMemberVO", description="多人存钱成员响应类")
public class GroupSavingMemberVO {
    @ApiModelProperty(value = "主键id")
    private Integer id;
    @ApiModelProperty(value = "用户id")
    private Integer userId;
    @ApiModelProperty(value = "成员姓名")
    private String memberName;
    @ApiModelProperty(value = "已存金额")
    private BigDecimal amount;
    @ApiModelProperty(value = "加入时间")
    private LocalDateTime joinTime;
    @ApiModelProperty(value = "是否为创建者")
    private Boolean isCreator;
    @ApiModelProperty(value = "是否退出计划")
    private Integer deleted;
    @ApiModelProperty(value = "退出时间")
    private LocalDateTime deletedAt;
}
