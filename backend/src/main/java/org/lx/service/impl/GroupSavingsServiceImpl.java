package org.lx.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.config.UserUtil;
import org.lx.mapper.*;
import org.lx.pojo.GroupSavings;
import org.lx.pojo.SavingDepositRecords;
import org.lx.pojo.SavingsMembers;
import org.lx.pojo.Users;
import org.lx.pojo.dto.*;
import org.lx.pojo.vo.*;
import org.lx.service.IGroupSavingsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * <p>
 * 多人存钱计划表 - 存储多人参与的存钱计划 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class GroupSavingsServiceImpl extends ServiceImpl<GroupSavingsMapper, GroupSavings> implements IGroupSavingsService {

    @Autowired
    private UsersMapper usersMapper;

    @Autowired
    private FriendsMapper friendsMapper;

    @Autowired
    private FriendsServiceImpl friendsService;

    @Autowired
    private GroupSavingsMapper groupSavingsMapper;

    @Autowired
    private SavingsMembersMapper savingsMembersMapper;

    @Autowired
    private SavingsMembersServiceImpl savingsMembersService;

    @Autowired
    private UserUtil userUtil;

    @Autowired
    private SavingDepositRecordsMapper savingDepositRecordsMapper;

    /**
     * 创建多人存钱计划
     * @param createGroupSavingRequestDTO
     * @return
     */
    @Override
    public RespBean createSavingGroup(GroupSavingRequestDTO createGroupSavingRequestDTO) {
        List<GroupSavingMemberRequestDTO> members = createGroupSavingRequestDTO.getMembers();
        Users user = userUtil.getUserFromSecurityContext();

        // 1. 验证成员数据
        for (GroupSavingMemberRequestDTO member : members) {
            // 跳过创建者自己
            if (member.getUserId().equals(user.getId())) {
                continue;
            }

            // 查询成员是否存在
            if (usersMapper.selectById(member.getUserId()) == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "用户 " + member.getName() + " 不存在");
            }

            // 查询是否是好友
            if (!friendsMapper.selectWhetherFriend(user.getId(), member.getUserId())) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "你与 " + member.getName() + " 并不是好友");
            }
        }

        // 2. 将数据存到数据库中
        try {
            // 2.1 插入主计划
            GroupSavings groupSavings = new GroupSavings();
            groupSavings.setName(createGroupSavingRequestDTO.getName())
                    .setReason(createGroupSavingRequestDTO.getReason())
                    .setDescription(createGroupSavingRequestDTO.getDescription())
                    .setDeadline(createGroupSavingRequestDTO.getDeadline())
                    .setTargetAmount(createGroupSavingRequestDTO.getTargetAmount())
                    .setCurrentAmount(createGroupSavingRequestDTO.getCurrentAmount())
                    .setType(createGroupSavingRequestDTO.getType())
                    .setCreatedBy(user.getId())
                    .setCreatedAt(LocalDateTime.now())
                    .setUpdatedAt(LocalDateTime.now());

            // 插入并获取自动生成的ID
            groupSavingsMapper.insert(groupSavings);
            Integer groupId = groupSavings.getId(); // 获取生成的ID

            // 2.2 批量插入成员
            List<SavingsMembers> savingsMembersList = new ArrayList<>();
            for (GroupSavingMemberRequestDTO member : members) {
                SavingsMembers savingsMember = new SavingsMembers();
                savingsMember.setGroupSavingId(groupId)
                        .setAmount(member.getAmount())
                        .setUserId(member.getUserId())
                        .setIsOwner(member.getIsCreator())
                        .setJoinedAt(LocalDateTime.now())
                        .setUpdateAt(LocalDateTime.now())
                        .setMemberName(user.getId() == member.getUserId() ? user.getUsername() : member.getName());
                savingsMembersList.add(savingsMember);
            }

            // 批量插入成员
            if (!savingsMembersList.isEmpty()) {
                savingsMembersMapper.batchInsert(savingsMembersList);
            }

            return RespBean.success(RespCode.SUCCESS, "创建多人存钱计划成功", groupId);

        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.INTERNAL_SERVER_ERROR, "创建失败: " + e.getMessage());
        }
    }

    /**
     * 获取多人存钱列表（包括已删除的）
     * @return
     */
    @Override
    public RespBean getSavingsGroupLIst() {
        try {
            // 1. 获取当前用户ID
            Integer userId = userUtil.getUserFromSecurityContext().getId();

            // 2. 查询用户参与的所有存钱组ID（包括已退出的）
            // 注意：这里需要手动添加条件，因为 @TableLogic 会自动加 deleted=0
            List<SavingsMembers> userMemberships = savingsMembersMapper.selectList(
                    new LambdaQueryWrapper<SavingsMembers>()
                            .eq(SavingsMembers::getUserId, userId)
                            // 不添加 .eq(SavingsMembers::getDeleted, 0) 条件，但要手动处理
                            .last("AND 1=1") // 这个技巧可以绕过 @TableLogic 吗？不一定
                            .select(SavingsMembers::getGroupSavingId,
                                    SavingsMembers::getDeleted,
                                    SavingsMembers::getDeletedAt)
            );

            // 如果用户没有参与任何存钱组，直接返回空列表
            if (userMemberships.isEmpty()) {
                return RespBean.success(RespCode.SUCCESS, "查询成功", Collections.emptyList());
            }

            // 3. 获取所有关联的存钱组ID（去重）
            Set<Integer> groupIds = userMemberships.stream()
                    .map(SavingsMembers::getGroupSavingId)
                    .collect(Collectors.toSet());

            // 4. 批量查询存钱计划详情（包括已删除的）
            // 使用自定义查询绕过 @TableLogic
            List<GroupSavings> groupSavingsList = groupSavingsMapper.selectListWithDeleted(groupIds);

            if (groupSavingsList.isEmpty()) {
                return RespBean.success(RespCode.SUCCESS, "查询成功", Collections.emptyList());
            }

            // 5. 批量查询所有相关组成员信息（包括已删除的）
            // 使用自定义查询绕过 @TableLogic
            List<SavingsMembers> allMembers = savingsMembersMapper.selectListWithDeleted(groupIds);

            // 6. 将成员信息按groupId分组
            Map<Integer, List<SavingsMembers>> membersByGroup = allMembers.stream()
                    .collect(Collectors.groupingBy(SavingsMembers::getGroupSavingId));

            // 7. 组装返回数据
            List<GroupSavingVO> groupSavingVOList = groupSavingsList.stream()
                    .map(group -> buildGroupSavingVOWithDeleteInfo(group, membersByGroup.getOrDefault(group.getId(), Collections.emptyList())))
                    .collect(Collectors.toList());

            // 8. 按创建时间倒序排序
            groupSavingVOList.sort((a, b) -> b.getCreateTime().compareTo(a.getCreateTime()));

            log.info("用户{}查询多人存钱列表成功（包含已删除），共{}条记录", userId, groupSavingVOList.size());
            return RespBean.success(RespCode.SUCCESS, "查询成功", groupSavingVOList);

        } catch (Exception e) {
            log.error("查询多人存钱列表失败", e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "查询失败: " + e.getMessage());
        }
    }

    /**
     * 更新多人存钱计划的信息
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public RespBean updateSavingGroup(Integer id, GroupSavingRequestDTO groupSavingRequestDTO) {
        if (groupSavingRequestDTO == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "数据异常");
        }
        Integer userID = userUtil.getUserFromSecurityContext().getId();

        GroupSavings groupSaving = groupSavingsMapper.selectOne(
                new LambdaQueryWrapper<GroupSavings>()
                        .eq(GroupSavings::getId, id)
        );
        if (groupSaving == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "计划不存在或已删除");
        }

        if (!groupSaving.getCreatedBy().equals(userID)) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "不是创建者不能修改计划");
        }

        try {
            // 3.1 查询现有成员（@TableLogic会自动处理deleted=0条件）
            LambdaQueryWrapper<SavingsMembers> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(SavingsMembers::getGroupSavingId, id);
            List<SavingsMembers> existingMembers = savingsMembersMapper.selectList(queryWrapper);

            // 创建现有成员Map方便查找
            Map<Integer, SavingsMembers> existingMemberMap = existingMembers.stream()
                    .collect(Collectors.toMap(SavingsMembers::getUserId, m -> m));

            // 3.2 准备新成员列表
            List<SavingsMembers> newMembersList = new ArrayList<>();
            List<Integer> keepUserIds = new ArrayList<>();

            for (GroupSavingMemberRequestDTO updateMember : groupSavingRequestDTO.getMembers()) {
                if (usersMapper.selectById(updateMember.getUserId()) == null) {
                    return RespBean.error(RespCode.DATA_NOT_FOUND, updateMember.getName() + "不存在");
                }

                keepUserIds.add(updateMember.getUserId());
                SavingsMembers existingMember = existingMemberMap.get(updateMember.getUserId());

                if (existingMember != null) {
                    // 更新现有成员
                    existingMember.setMemberName(updateMember.getName())
                            .setAmount(updateMember.getAmount())
                            .setIsOwner(updateMember.getIsCreator())
                            .setUpdateAt(LocalDateTime.now());
                    newMembersList.add(existingMember);
                } else {
                    // 添加新成员
                    SavingsMembers newMember = new SavingsMembers();
                    newMember.setGroupSavingId(id)
                            .setUserId(updateMember.getUserId())
                            .setMemberName(updateMember.getName())
                            .setAmount(updateMember.getAmount())
                            .setIsOwner(updateMember.getIsCreator())
                            .setJoinedAt(LocalDateTime.now())
                            .setUpdateAt(LocalDateTime.now());
                    newMembersList.add(newMember);
                }
            }

            // 3.3 软删除不存在的成员
            List<Integer> existingUserIds = existingMembers.stream()
                    .map(SavingsMembers::getUserId)
                    .collect(Collectors.toList());

            List<Integer> toDeleteUserIds = existingUserIds.stream()
                    .filter(uid -> !keepUserIds.contains(uid))
                    .collect(Collectors.toList());

            if (!toDeleteUserIds.isEmpty()) {
                // 3.3.1 软删除成员（使用delete方法，@TableLogic会自动转成update）
                LambdaUpdateWrapper<SavingsMembers> updateWrapper = new LambdaUpdateWrapper<>();
                updateWrapper.eq(SavingsMembers::getGroupSavingId, id)
                        .in(SavingsMembers::getUserId, toDeleteUserIds)
                        .set(SavingsMembers::getDeletedAt, LocalDateTime.now());
                savingsMembersMapper.delete(new LambdaQueryWrapper<SavingsMembers>()
                        .eq(SavingsMembers::getGroupSavingId, id)
                        .in(SavingsMembers::getUserId, toDeleteUserIds));

                // 3.3.2 软删除该成员的所有存款记录（使用delete方法，@TableLogic会自动转成update）
                int deletedDepositCount = savingDepositRecordsMapper.delete(
                        new LambdaQueryWrapper<SavingDepositRecords>()
                                .eq(SavingDepositRecords::getGroupSavingId, id)
                                .in(SavingDepositRecords::getUserId, toDeleteUserIds)
                );

                log.info("软删除了 {} 条存款记录，涉及用户IDs: {}", deletedDepositCount, toDeleteUserIds);

                // 重新计算计划的当前总额（减去被删除用户的存款）
                if (deletedDepositCount > 0) {
                    recalculateGroupCurrentAmount(id);
                }
            }

            // 3.4 批量插入新成员
            List<SavingsMembers> insertList = newMembersList.stream()
                    .filter(m -> m.getId() == null)
                    .collect(Collectors.toList());
            if (!insertList.isEmpty()) {
                savingsMembersMapper.batchInsert(insertList);
            }

            // 3.5 批量更新现有成员
            List<SavingsMembers> updateList = newMembersList.stream()
                    .filter(m -> m.getId() != null)
                    .collect(Collectors.toList());
            for (SavingsMembers member : updateList) {
                savingsMembersMapper.updateById(member);
            }

            // 4. 更新计划
            groupSaving.setName(groupSavingRequestDTO.getName())
                    .setReason(groupSavingRequestDTO.getReason())
                    .setDescription(groupSavingRequestDTO.getDescription())
                    .setDeadline(groupSavingRequestDTO.getDeadline())
                    .setTargetAmount(groupSavingRequestDTO.getTargetAmount())
                    .setCurrentAmount(groupSavingRequestDTO.getCurrentAmount())
                    .setType(groupSavingRequestDTO.getType())
                    .setUpdatedAt(LocalDateTime.now());
            groupSavingsMapper.updateById(groupSaving);

            // 5. 计算进度
            int progress = groupSaving.getTargetAmount().compareTo(BigDecimal.ZERO) > 0
                    ? groupSaving.getCurrentAmount().multiply(new BigDecimal(100))
                    .divide(groupSaving.getTargetAmount(), 0, BigDecimal.ROUND_HALF_UP)
                    .intValue()
                    : 0;

            // 6. 查询最终成员列表（@TableLogic会自动处理deleted=0条件）
            List<SavingsMembers> finalMembers = savingsMembersMapper.selectList(
                    new LambdaQueryWrapper<SavingsMembers>()
                            .eq(SavingsMembers::getGroupSavingId, id)
            );

            // 7. 组装响应
            GroupSavingVO vo = buildGroupSavingVO(groupSaving, finalMembers);
            vo.setProgress(progress);

            return RespBean.success(RespCode.SUCCESS, "修改成功", vo);
        } catch (Exception e) {
            log.error("修改多人存钱计划失败", e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "修改失败: " + e.getMessage());
        }
    }


    /**
     * 存钱
     * @param id
     * @param depositDTO
     * @return
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public RespBean deposit(Integer id, DepositDTO depositDTO) {
        //1.查询计划是否存在且未删除（@TableLogic会自动处理deleted=0条件）
        GroupSavings groupSavings = groupSavingsMapper.selectOne(
                new LambdaQueryWrapper<GroupSavings>()
                        .eq(GroupSavings::getId, id)
        );
        if (groupSavings == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "计划不存在或已删除");
        }

        //2.查询成员是否存在且未删除（@TableLogic会自动处理deleted=0条件）
        SavingsMembers savingsMember = savingsMembersMapper.selectOne(
                new LambdaQueryWrapper<SavingsMembers>()
                        .eq(SavingsMembers::getGroupSavingId, id)
                        .eq(SavingsMembers::getUserId, depositDTO.getMemberId())
        );
        if (savingsMember == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "成员不存在或已退出");
        }

        //3.判断存钱金额是否合理
        BigDecimal newTotalAmount = groupSavings.getCurrentAmount().add(depositDTO.getAmount());
        if (newTotalAmount.compareTo(groupSavings.getTargetAmount()) > 0) {
            BigDecimal maxAllowed = groupSavings.getTargetAmount().subtract(groupSavings.getCurrentAmount());
            return RespBean.error(RespCode.DATA_NOT_FOUND, String.format("存入金额超出目标金额，最多可存: %s", maxAllowed));
        }

        //4.若存在则修改三张表
        try {
            BigDecimal newMemberAmount = savingsMember.getAmount().add(depositDTO.getAmount());

            //4.1更新存钱记录表
            SavingDepositRecords savingDepositRecords = new SavingDepositRecords();
            savingDepositRecords.setGroupSavingId(id)
                    .setMemberId(savingsMember.getId())
                    .setUserId(userUtil.getUserFromSecurityContext().getId())
                    .setMemberName(savingsMember.getMemberName())
                    .setAmount(depositDTO.getAmount())
                    .setBeforeAmount(savingsMember.getAmount())
                    .setAfterAmount(newMemberAmount)
                    .setPlanBeforeAmount(groupSavings.getCurrentAmount())
                    .setPlanAfterAmount(newTotalAmount)
                    .setNote(depositDTO.getNote())
                    .setDepositTime(LocalDateTime.now());
            savingDepositRecordsMapper.insert(savingDepositRecords);

            //4.2更新存钱计划表
            groupSavings.setCurrentAmount(newTotalAmount);
            groupSavings.setUpdatedAt(LocalDateTime.now());
            groupSavingsMapper.updateById(groupSavings);

            //4.3跟新存钱成员表
            LambdaUpdateWrapper<SavingsMembers> updateWrapper = new LambdaUpdateWrapper<>();
            updateWrapper.eq(SavingsMembers::getGroupSavingId, id)
                    .eq(SavingsMembers::getUserId, savingsMember.getUserId())
                    .set(SavingsMembers::getAmount, newMemberAmount)
                    .set(SavingsMembers::getUpdateAt, LocalDateTime.now());

            savingsMembersMapper.update(null, updateWrapper);

            // 5. 计算进度
            int progress = groupSavings.getTargetAmount().compareTo(BigDecimal.ZERO) > 0
                    ? newTotalAmount.multiply(new BigDecimal(100))
                    .divide(groupSavings.getTargetAmount(), 0, BigDecimal.ROUND_HALF_UP)
                    .intValue()
                    : 0;

            //6.组装返回类
            DepositVO depositVO = new DepositVO();
            depositVO.setPlanId(id)
                    .setMemberId(depositDTO.getMemberId())
                    .setAmount(depositDTO.getAmount())
                    .setMemberTotal(newMemberAmount)
                    .setPlanTotal(newTotalAmount)
                    .setProgress(progress);
            return RespBean.success(RespCode.SUCCESS, "存钱成功", depositVO);

        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.DATA_NOT_FOUND, "存钱失败" + e.getMessage());
        }
    }

    /**
     * 删除存钱信息
     * @param id
     * @return
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public RespBean deleteGroupSaving(Integer id) {
        //1.判断用户是否是计划的创建者
        Integer userId = userUtil.getUserFromSecurityContext().getId();

        //根据用户id和计划id查询对应的存钱成员信息（@TableLogic会自动处理deleted=0条件）
        LambdaQueryWrapper<SavingsMembers> quWrapper = new LambdaQueryWrapper<>();
        quWrapper.eq(SavingsMembers::getGroupSavingId, id)
                .eq(SavingsMembers::getUserId, userId);
        SavingsMembers savingsMember = savingsMembersMapper.selectOne(quWrapper);

        if (savingsMember == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "用户并不在计划中");
        }
        if (!savingsMember.getIsOwner()) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "不是创建者不能删除计划");
        }

        //2.软删除对应计划（使用delete方法，@TableLogic会自动转成update）
        try {
            // 删除所有成员（会自动逻辑删除）
            savingsMembersMapper.delete(new LambdaQueryWrapper<SavingsMembers>()
                    .eq(SavingsMembers::getGroupSavingId, id));

            // 删除计划本身（会自动逻辑删除）
            groupSavingsMapper.deleteById(id);

            // 删除所有存款记录（会自动逻辑删除）
            savingDepositRecordsMapper.delete(new LambdaQueryWrapper<SavingDepositRecords>()
                    .eq(SavingDepositRecords::getGroupSavingId, id));

            return RespBean.success(RespCode.SUCCESS, "删除计划成功");

        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.DATA_NOT_FOUND, "删除计划失败: " + e.getMessage());
        }
    }

    /**
     * 退出多人存钱计划
     * @param id
     * @return
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public RespBean leaveGroupSaving(Integer id, SavingGroupLeaveDTO savingGroupLeaveDTO) {
        //1.查询计划是否存在
        if (groupSavingsMapper.selectById(id) == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "没有该计划");
        }

        //2.查询新的创建者是否存在
        if (savingGroupLeaveDTO.getNewCreatorId() != null) {
            //2.1查询新的创建者是否存在
            if (usersMapper.selectById(savingGroupLeaveDTO.getNewCreatorId()) == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "新的创建者不存在");
            }

            //2.2查询新的创建者是否是存钱计划的一员（@TableLogic会自动处理deleted=0条件）
            LambdaQueryWrapper<SavingsMembers> queryWrapperToFindMember = new LambdaQueryWrapper<>();
            queryWrapperToFindMember.eq(SavingsMembers::getGroupSavingId, id)
                    .eq(SavingsMembers::getUserId, savingGroupLeaveDTO.getNewCreatorId());
            SavingsMembers savingsMembers = savingsMembersMapper.selectOne(queryWrapperToFindMember);

            if (savingsMembers == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "新选的创建者不在本计划内");
            }

            //2.3修改新创建者的isOwner信息(member表)
            LambdaUpdateWrapper<SavingsMembers> updateWrapperToUpdateCreator = new LambdaUpdateWrapper<>();
            updateWrapperToUpdateCreator.eq(SavingsMembers::getGroupSavingId, id)
                    .eq(SavingsMembers::getUserId, savingGroupLeaveDTO.getNewCreatorId())
                    .set(SavingsMembers::getIsOwner, true)
                    .set(SavingsMembers::getUpdateAt, LocalDateTime.now());

            savingsMembersMapper.update(null, updateWrapperToUpdateCreator);

            //2.4修改计划表中的creator信息
            LambdaUpdateWrapper<GroupSavings> updateWrapperToGroupSavingCreator = new LambdaUpdateWrapper<>();
            updateWrapperToGroupSavingCreator.eq(GroupSavings::getId, id)
                    .set(GroupSavings::getCreatedBy, savingGroupLeaveDTO.getNewCreatorId())
                    .set(GroupSavings::getUpdatedAt, LocalDateTime.now());
            groupSavingsMapper.update(null, updateWrapperToGroupSavingCreator);
        }

        try {
            Integer userId = userUtil.getUserFromSecurityContext().getId();

            //3.删除成员记录（会自动逻辑删除）
            savingsMembersMapper.delete(new LambdaQueryWrapper<SavingsMembers>()
                    .eq(SavingsMembers::getGroupSavingId, id)
                    .eq(SavingsMembers::getUserId, userId));

            //4.删除存款记录（会自动逻辑删除）
            savingDepositRecordsMapper.delete(new LambdaQueryWrapper<SavingDepositRecords>()
                    .eq(SavingDepositRecords::getGroupSavingId, id)
                    .eq(SavingDepositRecords::getUserId, userId));

            return RespBean.success(RespCode.SUCCESS, "退出计划成功");
        } catch (Exception e) {
            e.printStackTrace();
            return RespBean.error(RespCode.DATA_NOT_FOUND, "退出失败: " + e.getMessage());
        }
    }

    /**
     * 根据计划id获取计划信息
     * @param id
     * @return
     */
    @Override
    public RespBean getGroupSaving(Integer id) {
        //1.根据id获取计划
        GroupSavings groupSaving = groupSavingsMapper.selectById(id);
        if (groupSaving == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "没有该计划");
        }
        //2.根据计划id获取成员（@TableLogic会自动处理deleted=0条件）
        LambdaQueryWrapper<SavingsMembers> queryWrapperToGetMember = new LambdaQueryWrapper<>();
        queryWrapperToGetMember.eq(SavingsMembers::getGroupSavingId, id);
        List<SavingsMembers> savingsMembersList = savingsMembersMapper.selectList(queryWrapperToGetMember);
        //3.组装数据
        GroupSavingVO vo = buildGroupSavingVO(groupSaving, savingsMembersList);
        return RespBean.success(RespCode.SUCCESS, "查询成功", vo);
    }

    /**
     * 查询存钱的详细信息（包含软删除的记录）- 使用纯SQL方式
     * @param groupRecordsQueryDTO
     * @return
     */
    @Override
    public RespBean getGroupRecords(GroupRecordsQueryDTO groupRecordsQueryDTO) {
        log.info("========== 查询存钱记录（包含软删除）- 纯SQL方式 ==========");
        log.info("查询参数: planId={}, memberId(成员id)={}, page={}, size={}, startTime={}, endTime={}",
                groupRecordsQueryDTO.getPlanId(),
                groupRecordsQueryDTO.getMemberId(),
                groupRecordsQueryDTO.getPage(),
                groupRecordsQueryDTO.getSize(),
                groupRecordsQueryDTO.getStartTime(),
                groupRecordsQueryDTO.getEndTime());

        // 1. 查看计划是否存在
        GroupSavings groupSaving = groupSavingsMapper.selectById(groupRecordsQueryDTO.getPlanId());
        if (groupSaving == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "计划不存在");
        }

        // 2. 成员筛选 - 获取成员记录ID（包含已退出的成员）
        Integer memberRecordId = null;
        if (groupRecordsQueryDTO.getMemberId() != null) {
            // 🔴 使用自定义方法查询成员，包含已退出的
            SavingsMembers savingsMember = savingsMembersMapper.selectMemberIncludeDeleted(
                    groupSaving.getId(),
                    groupRecordsQueryDTO.getMemberId()
            );

            if (savingsMember != null) {
                memberRecordId = savingsMember.getId();
                log.info("找到成员记录: memberRecordId={}, userId={}, deleted={}, memberName={}",
                        savingsMember.getId(),
                        savingsMember.getUserId(),
                        savingsMember.getDeleted(),
                        savingsMember.getMemberName());
            } else {
                log.warn("未找到对应的成员记录: planId={}, userId={}",
                        groupSaving.getId(), groupRecordsQueryDTO.getMemberId());

                Map<String, Object> emptyResult = new HashMap<>();
                emptyResult.put("records", Collections.emptyList());
                emptyResult.put("total", 0L);
                emptyResult.put("page", groupRecordsQueryDTO.getPage() != null ? groupRecordsQueryDTO.getPage() : 1);
                emptyResult.put("size", groupRecordsQueryDTO.getSize() != null ? groupRecordsQueryDTO.getSize() : 10);
                emptyResult.put("pages", 0);
                emptyResult.put("stats", new HashMap<String, Object>() {{
                    put("normalCount", 0);
                    put("deletedCount", 0);
                }});

                return RespBean.success(RespCode.SUCCESS, "查询成功", emptyResult);
            }
        }

        // 3. 分页查询 - 使用纯SQL方式（绕过逻辑删除）
        int pageNum = groupRecordsQueryDTO.getPage() != null ? groupRecordsQueryDTO.getPage() : 1;
        int pageSize = groupRecordsQueryDTO.getSize() != null ? groupRecordsQueryDTO.getSize() : 10;

        Page<SavingDepositRecords> page = new Page<>(pageNum, pageSize);

        Page<SavingDepositRecords> pageResult = savingDepositRecordsMapper.selectPageIncludeDeletedSimple(
                page,
                groupRecordsQueryDTO.getPlanId(),
                memberRecordId,
                groupRecordsQueryDTO.getStartTime(),
                groupRecordsQueryDTO.getEndTime()
        );

        log.info("查询到 {} 条记录（包含软删除），总记录数 {}",
                pageResult.getRecords().size(), pageResult.getTotal());

        // 统计正常和已删除的记录数
        long normalCount = pageResult.getRecords().stream()
                .filter(r -> r.getDeleted() == 0)
                .count();
        long deletedCount = pageResult.getRecords().stream()
                .filter(r -> r.getDeleted() == 1)
                .count();
        log.info("正常记录: {}, 已删除记录: {}", normalCount, deletedCount);

        // 打印所有记录的 deleted 状态，用于调试
        if (!pageResult.getRecords().isEmpty()) {
            log.info("===== 记录详情 =====");
            for (SavingDepositRecords record : pageResult.getRecords()) {
                log.info("记录ID: {}, deleted: {}, deletedAt: {}, amount: {}, memberId: {}, memberName: {}",
                        record.getId(),
                        record.getDeleted(),
                        record.getDeletedAt(),
                        record.getAmount(),
                        record.getMemberId(),
                        record.getMemberName());
            }
        }

        // 4. 组装数据 - 转换为VO并包含deleted信息
        List<SavingDepositRecordVO> voList = pageResult.getRecords().stream()
                .map(this::convertToVOWithDeletedInfo)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("records", voList);
        result.put("total", pageResult.getTotal());
        result.put("page", pageNum);
        result.put("size", pageSize);
        result.put("pages", pageResult.getPages());

        // 额外返回统计信息
        Map<String, Object> stats = new HashMap<>();
        stats.put("normalCount", normalCount);
        stats.put("deletedCount", deletedCount);
        result.put("stats", stats);

        return RespBean.success(RespCode.SUCCESS, "查询成功", result);
    }

    /**
     * 查询存钱的详细信息
     * @param planId
     * @param memberId
     * @return
     */
    @Override
    public RespBean getGroupRecordsForMember(Integer planId, Integer memberId) {
        //1.查询计划是否存在且未删除（@TableLogic会自动处理deleted=0条件）
        GroupSavings groupSaving = groupSavingsMapper.selectOne(
                new LambdaQueryWrapper<GroupSavings>()
                        .eq(GroupSavings::getId, planId)
        );
        if (groupSaving == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "计划不存在或已删除");
        }

        //2.查询用户是否存在
        Users user = usersMapper.selectById(memberId);
        if (user == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "用户不存在");
        }

        //3.查询用户是否参与计划（包括已退出的）- 使用忽略逻辑删除的方法
        SavingsMembers savingsMember = savingsMembersMapper.selectMemberIncludeDeleted(planId, memberId);
        if (savingsMember == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "用户并未参与计划");
        }

        //4.查询记录 - 使用自定义方法忽略逻辑删除
        List<SavingDepositRecords> savingDepositRecord = savingDepositRecordsMapper.selectAllByMemberId(
                planId, savingsMember.getId());

        //5.组装数据 - 这里把 deleted 和 deletedAt 也传给前端
        List<GroupRecordsVO> groupRecordsVOList = savingDepositRecord.stream()
                .map(this::convertToGroupRecordsVOWithDeleteInfo)
                .collect(Collectors.toList());

        return RespBean.success(RespCode.SUCCESS, "查询成功", groupRecordsVOList);
    }

    /**
     * 构建存钱计划VO
     */
    private GroupSavingVO buildGroupSavingVO(GroupSavings group, List<SavingsMembers> members) {
        GroupSavingVO vo = new GroupSavingVO();

        // 设置计划基本信息
        vo.setId(group.getId())
                .setName(group.getName())
                .setDescription(group.getDescription())
                .setReason(group.getReason())
                .setTargetAmount(group.getTargetAmount())
                .setCurrentAmount(group.getCurrentAmount())
                .setDeadline(group.getDeadline())
                .setType(group.getType())
                .setStatus(group.getStatus())
                .setCreatorId(group.getCreatedBy())
                .setCreateTime(group.getCreatedAt())
                .setUpdateTime(group.getUpdatedAt());

        // 设置成员列表
        List<GroupSavingMemberVO> memberVOs = members.stream()
                .map(this::buildMemberVO)
                .collect(Collectors.toList());
        vo.setMembers(memberVOs);

        // 查找并设置创建者名称
        members.stream()
                .filter(member -> Boolean.TRUE.equals(member.getIsOwner()))
                .findFirst()
                .ifPresent(owner -> vo.setCreatorName(owner.getMemberName()));

        return vo;
    }

    /**
     * 构建成员VO
     */
    private GroupSavingMemberVO buildMemberVO(SavingsMembers member) {
        return new GroupSavingMemberVO()
                .setId(member.getId())
                .setAmount(member.getAmount())
                .setUserId(member.getUserId())
                .setJoinTime(member.getJoinedAt())
                .setMemberName(member.getMemberName())
                .setIsCreator(member.getIsOwner());
    }

    /**
     * 应用时间范围筛选
     */
    private void applyTimeRangeFilter(LambdaQueryWrapper<SavingDepositRecords> wrapper, GroupRecordsQueryDTO dto) {
        boolean hasStartTime = dto.getStartTime() != null && !dto.getStartTime().isEmpty();
        boolean hasEndTime = dto.getEndTime() != null && !dto.getEndTime().isEmpty();

        log.info("时间筛选条件: hasStartTime={}, hasEndTime={}, startTime={}, endTime={}",
                hasStartTime, hasEndTime, dto.getStartTime(), dto.getEndTime());

        try {
            if (hasStartTime && hasEndTime) {
                LocalDateTime start = LocalDate.parse(dto.getStartTime()).atStartOfDay();
                LocalDateTime end = LocalDate.parse(dto.getEndTime()).atTime(LocalTime.MAX);

                log.info("时间范围查询: {} 到 {}", start, end);

                wrapper.between(SavingDepositRecords::getDepositTime, start, end);
            } else if (hasStartTime) {
                LocalDateTime start = LocalDate.parse(dto.getStartTime()).atStartOfDay();
                log.info("开始时间之后: {}", start);
                wrapper.ge(SavingDepositRecords::getDepositTime, start);
            } else if (hasEndTime) {
                LocalDateTime end = LocalDate.parse(dto.getEndTime()).atTime(LocalTime.MAX);
                log.info("结束时间之前: {}", end);
                wrapper.le(SavingDepositRecords::getDepositTime, end);
            } else {
                log.info("没有时间筛选条件");
            }
        } catch (Exception e) {
            log.error("时间参数解析失败: startTime={}, endTime={}", dto.getStartTime(), dto.getEndTime(), e);
        }
    }

    /**
     * 将 SavingDepositRecords 实体转换为 SavingRecordVO
     */
    private SavingRecordVO convertToVO(SavingDepositRecords record) {
        if (record == null) return null;

        SavingRecordVO vo = new SavingRecordVO();

        vo.setId(record.getId())
                .setPlanId(record.getGroupSavingId())
                .setMemberId(record.getMemberId())
                .setMemberName(record.getMemberName())
                .setAmount(record.getAmount())
                .setNote(record.getNote());

        if (record.getDepositTime() != null) {
            vo.setCreateTime(record.getDepositTime()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }

        return vo;
    }

    /**
     * 将 SavingDepositRecords 实体转换为 GroupRecordsVO
     */
    private GroupRecordsVO convertToGroupRecordsVO(SavingDepositRecords record) {
        if (record == null) return null;

        GroupRecordsVO vo = new GroupRecordsVO();

        vo.setId(record.getId())
                .setPlanId(record.getGroupSavingId())
                .setMemberId(record.getMemberId())
                .setMemberName(record.getMemberName())
                .setAmount(record.getAmount())
                .setNote(record.getNote())
                .setDeleted(record.getDeleted())
                .setDeletedAt(record.getDeletedAt());

        if (record.getDepositTime() != null) {
            vo.setCreateTime(record.getDepositTime());
        }

        return vo;
    }

    /**
     * 重新计算计划的当前总额
     */
    private void recalculateGroupCurrentAmount(Integer groupId) {
        // 查询所有未被删除的存款记录的总和（@TableLogic会自动处理deleted=0条件）
        BigDecimal totalAmount = savingDepositRecordsMapper.selectObjs(
                        new LambdaQueryWrapper<SavingDepositRecords>()
                                .eq(SavingDepositRecords::getGroupSavingId, groupId)
                                .select(SavingDepositRecords::getAmount)
                ).stream()
                .map(amount -> (BigDecimal) amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 更新计划的当前金额
        GroupSavings groupSaving = new GroupSavings();
        groupSaving.setId(groupId)
                .setCurrentAmount(totalAmount)
                .setUpdatedAt(LocalDateTime.now());
        groupSavingsMapper.updateById(groupSaving);
    }

    /**
     * 将 SavingDepositRecords 实体转换为 GroupRecordsVO（包含删除信息）
     */
    private GroupRecordsVO convertToGroupRecordsVOWithDeleteInfo(SavingDepositRecords record) {
        if (record == null) return null;

        GroupRecordsVO vo = new GroupRecordsVO();

        vo.setId(record.getId())
                .setPlanId(record.getGroupSavingId())
                .setMemberId(record.getMemberId())
                .setMemberName(record.getMemberName())
                .setAmount(record.getAmount())
                .setNote(record.getNote())
                .setDeleted(record.getDeleted())      // 设置删除状态
                .setDeletedAt(record.getDeletedAt()); // 设置删除时间

        if (record.getDepositTime() != null) {
            vo.setCreateTime(record.getDepositTime());
        }

        return vo;
    }

    /**
     * 构建存钱计划VO（包含删除信息）
     */
    private GroupSavingVO buildGroupSavingVOWithDeleteInfo(GroupSavings group, List<SavingsMembers> members) {
        GroupSavingVO vo = new GroupSavingVO();

        // 设置计划基本信息
        vo.setId(group.getId())
                .setName(group.getName())
                .setDescription(group.getDescription())
                .setReason(group.getReason())
                .setTargetAmount(group.getTargetAmount())
                .setCurrentAmount(group.getCurrentAmount())
                .setDeadline(group.getDeadline())
                .setType(group.getType())
                .setStatus(group.getStatus())
                .setCreatorId(group.getCreatedBy())
                .setCreateTime(group.getCreatedAt())
                .setUpdateTime(group.getUpdatedAt())
                .setDeleted(group.getDeleted())      // 新增：计划删除状态
                .setDeletedAt(group.getDeletedAt()); // 新增：计划删除时间

        // 设置成员列表（包含删除信息）
        List<GroupSavingMemberVO> memberVOs = members.stream()
                .map(this::buildMemberVOWithDeleteInfo)
                .collect(Collectors.toList());
        vo.setMembers(memberVOs);

        // 查找并设置创建者名称
        members.stream()
                .filter(member -> Boolean.TRUE.equals(member.getIsOwner()))
                .findFirst()
                .ifPresent(owner -> vo.setCreatorName(owner.getMemberName()));

        // 计算进度
        int progress = group.getTargetAmount().compareTo(BigDecimal.ZERO) > 0
                ? group.getCurrentAmount().multiply(new BigDecimal(100))
                .divide(group.getTargetAmount(), 0, BigDecimal.ROUND_HALF_UP)
                .intValue()
                : 0;
        vo.setProgress(progress);

        return vo;
    }

    /**
     * 构建成员VO（包含删除信息）
     */
    private GroupSavingMemberVO buildMemberVOWithDeleteInfo(SavingsMembers member) {
        return new GroupSavingMemberVO()
                .setId(member.getId())
                .setAmount(member.getAmount())
                .setUserId(member.getUserId())
                .setJoinTime(member.getJoinedAt())
                .setMemberName(member.getMemberName())
                .setIsCreator(member.getIsOwner())
                .setDeleted(member.getDeleted())      // 新增：成员删除状态
                .setDeletedAt(member.getDeletedAt()); // 新增：成员删除时间
    }

    /**
     * 转换为VO并包含软删除信息（增强版）
     */
    private SavingDepositRecordVO convertToVOWithDeletedInfo(SavingDepositRecords record) {
        if (record == null) return null;

        log.info("【转换】开始转换记录: id={}, memberId={}, deleted={}, deletedAt={}",
                record.getId(), record.getMemberId(), record.getDeleted(), record.getDeletedAt());

        SavingDepositRecordVO vo = new SavingDepositRecordVO();

        // 手动复制所有字段，确保软删除字段被正确复制
        vo.setId(record.getId());
        vo.setMemberId(record.getMemberId());
        vo.setAmount(record.getAmount());
        vo.setNote(record.getNote());
        vo.setDepositTime(record.getDepositTime());

        // 🔴 关键：手动设置软删除字段
        vo.setDeleted(record.getDeleted());
        vo.setDeletedAt(record.getDeletedAt());

        log.info("【转换】复制后: deleted={}, deletedAt={}",
                vo.getDeleted(), vo.getDeletedAt());

        // 设置成员名称 - 优先使用记录中的 memberName
        if (record.getMemberName() != null && !record.getMemberName().isEmpty()) {
            vo.setMemberName(record.getMemberName());
            log.info("【转换】使用记录中的memberName={}", record.getMemberName());
        } else if (record.getMemberId() != null) {
            // 如果记录中没有memberName，再查询成员表
            try {
                LambdaQueryWrapper<SavingsMembers> memberQuery = new LambdaQueryWrapper<>();
                memberQuery.eq(SavingsMembers::getId, record.getMemberId());
                SavingsMembers member = savingsMembersMapper.selectOne(memberQuery);
                if (member != null && member.getMemberName() != null) {
                    vo.setMemberName(member.getMemberName());
                    log.info("【转换】从成员表查询到memberName={}", member.getMemberName());
                }
            } catch (Exception e) {
                log.warn("【转换】查询成员名称失败: {}", e.getMessage());
            }
        }

        return vo;
    }
}