package org.lx.controller;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.pojo.dto.DepositDTO;
import org.lx.pojo.dto.GroupRecordsQueryDTO;
import org.lx.pojo.dto.GroupSavingRequestDTO;
import org.lx.pojo.dto.SavingGroupLeaveDTO;
import org.lx.service.IGroupSavingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * @Title: SavingController
 * @Author: MrLu2
 * @Package: org.lx.controller
 * @Date: 2026/3/4 16:33
 * @Description: 多人存钱接口
 */

@Api(tags = "多人存钱接口")
@RestController
@Slf4j
@RequestMapping("/savings")
public class SavingController {

    @Autowired
    private IGroupSavingsService groupSavingsService;

    @ApiOperation(value = "获取多人存钱列表信息")
    @GetMapping("/group/list")
    public RespBean getSavingsGroupList() {
        return groupSavingsService.getSavingsGroupLIst();
    }

    @ApiOperation(value = "创建多人存钱计划")
    @PostMapping("/group/create")
    public RespBean createSavingGroup(@RequestBody GroupSavingRequestDTO createGroupSavingRequestDTO) {
        return groupSavingsService.createSavingGroup(createGroupSavingRequestDTO);
    }

    @ApiOperation(value = "更新多人存钱计划的信息")
    @PutMapping("/group/{id}")
    public RespBean updateSavingGroup(@PathVariable("id") Integer id, @RequestBody GroupSavingRequestDTO createGroupSavingRequestDTO) {
        return groupSavingsService.updateSavingGroup(id, createGroupSavingRequestDTO);
    }

    @ApiOperation(value = "存钱接口")
    @PostMapping("/group/{id}/deposit")
    public RespBean deposit(@PathVariable("id") Integer id, @RequestBody DepositDTO depositDTO) {
        return groupSavingsService.deposit(id, depositDTO);
    }

    @ApiOperation(value = "删除计划")
    @DeleteMapping("/group/{id}")
    public RespBean deleteGroupSaving(@PathVariable("id") Integer id) {
        return groupSavingsService.deleteGroupSaving(id);
    }

    @ApiOperation(value = "退出多人存钱计划")
    @PostMapping("/group/{id}/leave")
    public RespBean leaveGroupSaving(@PathVariable("id") Integer id, @RequestBody SavingGroupLeaveDTO savingGroupLeaveDTO) {
        return groupSavingsService.leaveGroupSaving(id, savingGroupLeaveDTO);
    }

    @ApiOperation(value = "获取多人存钱计划详情")
    @GetMapping("/group/{id}")
    public RespBean getGroupSaving(@PathVariable("id") Integer id) {
        return groupSavingsService.getGroupSaving(id);
    }

    @ApiOperation(value = "获取计划的存钱记录(用于分页查询)")
    @PostMapping("/group/{id}/records")
    public RespBean getGroupRecords(@PathVariable("id") Integer id, @RequestBody GroupRecordsQueryDTO groupRecordsQueryDTO) {
        groupRecordsQueryDTO.setPlanId(id);
        return groupSavingsService.getGroupRecords(groupRecordsQueryDTO);
    }

    @ApiOperation(value = "获取个人的详细存钱信息")
    @GetMapping("/group/{planId}/member/{memberId}/records")
    public RespBean getGroupRecordsForMember(@PathVariable("planId") Integer planId, @PathVariable("memberId") Integer memberId) {
        return groupSavingsService.getGroupRecordsForMember(planId, memberId);
    }

    @ApiOperation(value = "根据用户id获取个人的详细存钱信息")
    @GetMapping("/group/{userId}/records")
    public RespBean getGroupRecordsByUserId(@PathVariable("userId") Integer userId) {
        log.info("AAAA" + userId);
        return groupSavingsService.getGroupRecordsByUserId(userId);
    }
}
