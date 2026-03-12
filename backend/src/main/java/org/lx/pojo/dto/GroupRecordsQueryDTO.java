package org.lx.pojo.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * @Title: GroupRecordsQueryDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/8 11:36
 * @Description: 获取多人存钱详细信息接收类
 */
@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="GroupRecordsQueryDTO对象", description="获取多人存钱详细信息接收类")
public class GroupRecordsQueryDTO {

    @ApiModelProperty(value = "计划id")
    private Integer planId;

    @ApiModelProperty(value = "成员id")
    private Integer memberId;

    @ApiModelProperty(value = "页数")
    private Integer page = 1;

    @ApiModelProperty(value = "每页数据数量")
    private Integer size = 10;

    @ApiModelProperty(value = "开始时间")
    @JsonProperty("startTime")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private String startTime;

    @ApiModelProperty(value = "结束时间")
    @JsonProperty("endTime")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private String endTime;
}
