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
 * 图表数据表 - 存储图表分析的数据快照
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("chart_data")
@ApiModel(value="ChartData对象", description="图表数据表 - 存储图表分析的数据快照")
public class ChartData implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "图表数据ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "用户ID，外键关联users表")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty(value = "图表类型（月度收支趋势、支出分类统计等）")
    @TableField("chart_type")
    private String chartType;

    @ApiModelProperty(value = "时间范围（本周、本月、本季、本年、自定义）")
    @TableField("time_range")
    private String timeRange;

    @ApiModelProperty(value = "图表数据，JSON格式存储")
    private String data;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
