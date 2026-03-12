package org.lx.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.swagger.annotations.Api;
import org.lx.mapper.SavingDepositRecordsMapper;
import org.lx.pojo.SavingDepositRecords;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * @Title: org.lx.controller.TestController
 * @Author: MrLu2
 * @Date: 2026/3/9
 * @Description: 软删除测试控制器
 */
@Api(tags = "测试软删除接口")
@RestController
@RequestMapping("/test")
public class TestController {

    @Autowired
    private SavingDepositRecordsMapper depositRecordMapper;

    /**
     * 测试软删除
     * 访问: http://localhost:8080/test/soft-delete
     */
    @GetMapping("/soft-delete")
    public String testSoftDelete() {
        StringBuilder result = new StringBuilder();
        result.append("========== 软删除测试开始 ==========<br>");

        try {
            // 1. 查询所有未删除的记录
            List<SavingDepositRecords> all = depositRecordMapper.selectList(null);
            result.append("1. 当前未删除记录数：").append(all.size()).append("<br>");

            // 显示前几条记录
            if (!all.isEmpty()) {
                result.append("   前3条记录ID：");
                all.stream().limit(3).forEach(r ->
                        result.append(r.getId()).append(" ")
                );
                result.append("<br>");
            }

            // 2. 如果有数据，软删除第一条
            if (!all.isEmpty()) {
                Integer idToDelete = all.get(0).getId();
                int rows = depositRecordMapper.deleteById(idToDelete);
                result.append("2. 软删除记录 ID=").append(idToDelete)
                        .append("，影响行数：").append(rows).append("<br>");
            }

            // 3. 再次查询未删除的记录
            List<SavingDepositRecords> after = depositRecordMapper.selectList(null);
            result.append("3. 删除后未删除记录数：").append(after.size()).append("<br>");

            // 4. 查询已删除的记录（手动加条件）
            List<SavingDepositRecords> deleted = depositRecordMapper.selectList(
                    new LambdaQueryWrapper<SavingDepositRecords>()
                            .eq(SavingDepositRecords::getDeleted, 1)
            );
            result.append("4. 已删除记录数：").append(deleted.size()).append("<br>");

            if (!deleted.isEmpty()) {
                result.append("   已删除记录ID：");
                deleted.forEach(r -> result.append(r.getId()).append(" "));
                result.append("<br>");
            }

            // 5. 验证是否能查到被删除的记录（不加条件应该查不到）
            SavingDepositRecords tryFind = depositRecordMapper.selectById(
                    !all.isEmpty() ? all.get(0).getId() : 1
            );
            result.append("5. 直接查询被删记录：").append(tryFind == null ? "null（查不到，正确）" : "查到了（错误）").append("<br>");

        } catch (Exception e) {
            result.append("❌ 测试出错：").append(e.getMessage()).append("<br>");
            e.printStackTrace();
        }

        result.append("========== 软删除测试结束 ==========");
        return result.toString().replace("\n", "<br>");
    }

    /**
     * 查看所有数据（包括已删除的）
     * 访问: http://localhost:8080/test/all
     */
    @GetMapping("/all")
    public String getAll() {
        // 查询所有数据（包括已删除的）
        List<SavingDepositRecords> all = depositRecordMapper.selectList(
                new LambdaQueryWrapper<SavingDepositRecords>()
        );

        StringBuilder sb = new StringBuilder();
        sb.append("总记录数：").append(all.size()).append("<br>");
        sb.append("<table border='1'><tr><th>ID</th><th>计划ID</th><th>金额</th><th>deleted</th><th>存入时间</th></tr>");

        for (SavingDepositRecords r : all) {
            sb.append("<tr>")
                    .append("<td>").append(r.getId()).append("</td>")
                    .append("<td>").append(r.getGroupSavingId()).append("</td>")
                    .append("<td>").append(r.getAmount()).append("</td>")
                    .append("<td>").append(r.getDeleted()).append("</td>")
                    .append("<td>").append(r.getDepositTime()).append("</td>")
                    .append("</tr>");
        }
        sb.append("</table>");

        return sb.toString();
    }

    /**
     * 恢复被软删除的记录
     * 访问: http://localhost:8080/test/recover/1
     */
    @GetMapping("/recover/{id}")
    public String recover(@PathVariable Integer id) {
        // 直接把 deleted 改回 0
        SavingDepositRecords record = new SavingDepositRecords();
        record.setId(id);
        record.setDeleted(0);

        int rows = depositRecordMapper.updateById(record);
        return "恢复记录 ID=" + id + "，结果：" + (rows > 0 ? "成功" : "失败");
    }
}