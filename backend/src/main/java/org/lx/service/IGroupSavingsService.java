package org.lx.service;

import org.lx.common.RespBean;
import org.lx.pojo.GroupSavings;
import com.baomidou.mybatisplus.extension.service.IService;
import org.lx.pojo.dto.DepositDTO;
import org.lx.pojo.dto.GroupRecordsQueryDTO;
import org.lx.pojo.dto.GroupSavingRequestDTO;
import org.lx.pojo.dto.SavingGroupLeaveDTO;

/**
 * <p>
 * 多人存钱计划表 - 存储多人参与的存钱计划 服务类
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
public interface IGroupSavingsService extends IService<GroupSavings> {

    /**
     * 创建多人存钱计划
     * @param createGroupSavingRequestDTO
     * @return
     */
    RespBean createSavingGroup(GroupSavingRequestDTO createGroupSavingRequestDTO);

    /**
     * 获取多人存钱列表
     * @return
     */
    RespBean getSavingsGroupLIst();

    /**
     * 更新多人存钱计划的信息
     * @param id
     * @param createGroupSavingRequestDTO
     * @return
     */
    RespBean updateSavingGroup(Integer id, GroupSavingRequestDTO createGroupSavingRequestDTO);

    /**
     * 存钱
     * @param id
     * @param depositDTO
     * @return
     */
    RespBean deposit(Integer id, DepositDTO depositDTO);

    /**
     * 删除存钱信息
     * @param id
     * @return
     */
    RespBean deleteGroupSaving(Integer id);

    /**
     * 退出多人存钱计划
     * @param id
     * @return
     */
    RespBean leaveGroupSaving(Integer id, SavingGroupLeaveDTO savingGroupLeaveDTO);

    /**
     * 根据计划id获取存钱计划信息
     * @param id
     * @return
     */
    RespBean getGroupSaving(Integer id);

    /**
     * 查询存钱的详细信息(用于分页查询)
     * @param groupRecordsQueryDTO
     * @return
     */
    RespBean getGroupRecords(GroupRecordsQueryDTO groupRecordsQueryDTO);

    /**
     * 查询存钱的详细信息
     * @param planId
     * @param memberId
     * @return
     */
    RespBean getGroupRecordsForMember(Integer planId, Integer memberId);

    /**
     * 根据用户id获取个人的详细存钱信息
     * @param userId
     * @return
     */
    RespBean getGroupRecordsByUserId(Integer userId);
}
