package org.lx.pojo.vo;

import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * @Title: SavingDepositRecordVO
 * @Author: MrLu2
 * @Package: org.lx.pojo.vo
 * @Date: 2026/3/11 14:36
 * @Description:
 */

@Accessors(chain = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="SavingDepositRecordVO对象", description="")
public class SavingDepositRecordVO {
    private Integer id;
    private Integer memberId;
    private String memberName;
    private BigDecimal amount;
    private String note;
    private LocalDateTime depositTime;

    // 新增：软删除字段
    private Integer deleted;        // 0-正常，1-已删除
    private LocalDateTime deletedAt; // 删除时间
}
