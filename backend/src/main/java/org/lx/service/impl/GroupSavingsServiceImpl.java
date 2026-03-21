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
            Integer groupId = groupSavings.getId();

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
                        .setMemberName(user.getId() == member.getUserId() ? user.getUsername() : member.getName())
                        .setDeleted(0)  // 新成员默认未删除
                        .setDeletedAt(null);
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
            List<SavingsMembers> userMemberships = savingsMembersMapper.selectListWithDeletedByUserId(userId);

            // 如果用户没有参与任何存钱组，直接返回空列表
            if (userMemberships.isEmpty()) {
                log.info("用户{}没有参与任何存钱计划", userId);
                return RespBean.success(RespCode.SUCCESS, "查询成功", Collections.emptyList());
            }

            // 3. 获取所有关联的存钱组ID（去重）
            Set<Integer> groupIds = userMemberships.stream()
                    .map(SavingsMembers::getGroupSavingId)
                    .collect(Collectors.toSet());

            log.info("用户{}参与的存钱计划ID列表: {}", userId, groupIds);

            // 4. 批量查询存钱计划详情（包括已删除的）
            List<GroupSavings> groupSavingsList = groupSavingsMapper.selectListWithDeleted(groupIds);

            if (groupSavingsList.isEmpty()) {
                log.info("用户{}参与的存钱计划没有找到任何计划数据", userId);
                return RespBean.success(RespCode.SUCCESS, "查询成功", Collections.emptyList());
            }

            // 5. 批量查询所有相关组成员信息（包括已删除的）
            List<SavingsMembers> allMembers = savingsMembersMapper.selectListWithDeleted(groupIds);

            log.info("查询到的所有成员总数（包括已删除）: {}", allMembers.size());
            for (SavingsMembers sm : allMembers) {
                log.info("成员: groupId={}, userId={}, memberName={}, deleted={}, deletedAt={}",
                        sm.getGroupSavingId(), sm.getUserId(), sm.getMemberName(), sm.getDeleted(), sm.getDeletedAt());
            }

            // 6. 将成员信息按groupId分组
            Map<Integer, List<SavingsMembers>> membersByGroup = allMembers.stream()
                    .collect(Collectors.groupingBy(SavingsMembers::getGroupSavingId));

            // 7. 组装返回数据（包含所有成员，包括已删除的）
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
        //1.验证数据
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

        //修改数据、删除成员、新增成员、移回成员，修改三个表
        try {
            //2.修改group_savings、savings_members
            //2.1修改计划数据
            LambdaUpdateWrapper<GroupSavings> updateWrapperToGroup = new LambdaUpdateWrapper<>();
            updateWrapperToGroup.eq(GroupSavings::getId, id)
                    .set(GroupSavings::getCurrentAmount, groupSavingRequestDTO.getCurrentAmount())
                    .set(GroupSavings::getTargetAmount, groupSavingRequestDTO.getTargetAmount())
                    .set(GroupSavings::getDeadline, groupSavingRequestDTO.getDeadline())
                    .set(GroupSavings::getDescription, groupSavingRequestDTO.getDescription())
                    .set(GroupSavings::getName, groupSavingRequestDTO.getName())
                    .set(GroupSavings::getReason, groupSavingRequestDTO.getReason())
                    .set(GroupSavings::getType, groupSavingRequestDTO.getType())
                    .set(GroupSavings::getUpdatedAt, LocalDateTime.now());

            groupSavingsMapper.update(null, updateWrapperToGroup);

            // 重新查询更新后的计划数据
            groupSaving = groupSavingsMapper.selectOne(
                    new LambdaQueryWrapper<GroupSavings>()
                            .eq(GroupSavings::getId, id)
            );

            //2.2修改成员表
            //2.2.1查询旧的数据（使用自定义SQL，包括已删除的记录）
            List<SavingsMembers> savingsMembersList = savingsMembersMapper.selectAllMembersByGroupId(id);

            log.info("查询到的成员数量（包括已删除）: {}", savingsMembersList.size());
            for (SavingsMembers sm : savingsMembersList) {
                log.info("成员: id={}, userId={}, deleted={}, deletedAt={}",
                        sm.getId(), sm.getUserId(), sm.getDeleted(), sm.getDeletedAt());
            }

            //2.2.2构建旧成员映射，key为userId，value为SavingsMembers
            Map<Integer, SavingsMembers> existingMemberMap = new HashMap<>();
            for (SavingsMembers sm : savingsMembersList) {
                existingMemberMap.put(sm.getUserId(), sm);
            }

            // 记录前端传来的所有用户ID
            Set<Integer> receivedUserIds = new HashSet<>();

            //2.2.3处理成员数据
            List<SavingsMembers> newSavingsMembersList = new ArrayList<>();
            List<GroupSavingMemberVO> newGroupSavingMemberVOList = new ArrayList<>();
            Set<Integer> deletedMemberIds = new HashSet<>();
            LocalDateTime now = LocalDateTime.now();

            for (GroupSavingMemberRequestDTO member : groupSavingRequestDTO.getMembers()) {
                // 记录前端传来的用户ID
                receivedUserIds.add(member.getUserId());

                SavingsMembers existingMember = existingMemberMap.get(member.getUserId());
                SavingsMembers newSavingsMember = new SavingsMembers();

                if (existingMember != null) {
                    // 已存在的成员（包括已删除的），设置ID和原有的加入时间
                    newSavingsMember.setId(existingMember.getId())
                            .setJoinedAt(existingMember.getJoinedAt());

                    // 根据删除状态变化处理 deletedAt
                    if (member.getDeleted() == 1) {
                        // 新删除：设置当前时间
                        newSavingsMember.setDeletedAt(now);
                        newSavingsMember.setDeleted(1);
                        log.info("成员将被删除: userId={}, deletedAt={}", member.getUserId(), now);
                    } else if (existingMember.getDeleted() == 1 && member.getDeleted() == 0) {
                        // 恢复：清空删除时间
                        newSavingsMember.setDeletedAt(null);
                        newSavingsMember.setDeleted(0);
                        log.info("成员将被恢复: userId={}, deletedAt清空", member.getUserId());
                    } else {
                        // 其他情况：保持原值
                        newSavingsMember.setDeletedAt(existingMember.getDeletedAt());
                        newSavingsMember.setDeleted(member.getDeleted());
                        log.info("成员状态不变: userId={}, deleted={}, deletedAt={}",
                                member.getUserId(), member.getDeleted(), existingMember.getDeletedAt());
                    }

                    log.info("找到已存在的成员: userId={}, 原deleted={}, 新deleted={}, 原deletedAt={}, 新deletedAt={}",
                            member.getUserId(), existingMember.getDeleted(), newSavingsMember.getDeleted(),
                            existingMember.getDeletedAt(), newSavingsMember.getDeletedAt());
                } else {
                    // 新成员，ID为null，加入时间为当前时间
                    newSavingsMember.setJoinedAt(now)
                            .setDeletedAt(null)
                            .setDeleted(0);  // 新成员默认未删除
                    log.info("新成员: userId={}, deleted=0, deletedAt=null", member.getUserId());
                }

                newSavingsMember.setGroupSavingId(id)
                        .setUserId(member.getUserId())
                        .setMemberName(member.getName())
                        .setAmount(member.getAmount())
                        .setIsOwner(member.getIsCreator())
                        .setUpdateAt(now);

                newSavingsMembersList.add(newSavingsMember);

                // 记录需要删除存款记录的成员ID（已存在且被软删除的成员）
                if (existingMember != null && newSavingsMember.getDeleted() == 1) {
                    deletedMemberIds.add(existingMember.getId());
                }

                // 构建VO
                GroupSavingMemberVO vo = new GroupSavingMemberVO();
                vo.setId(newSavingsMember.getId())
                        .setUserId(newSavingsMember.getUserId())
                        .setMemberName(newSavingsMember.getMemberName())
                        .setAmount(newSavingsMember.getAmount())
                        .setJoinTime(newSavingsMember.getJoinedAt())
                        .setIsCreator(newSavingsMember.getIsOwner())
                        .setDeleted(newSavingsMember.getDeleted())
                        .setDeletedAt(newSavingsMember.getDeletedAt());
                newGroupSavingMemberVOList.add(vo);
            }

            // 处理在前端被移除的成员（不在前端列表中的成员）
            for (SavingsMembers existingMember : savingsMembersList) {
                // 跳过创建者（创建者不能被软删除）
                if (existingMember.getIsOwner()) {
                    log.info("跳过创建者: userId={}", existingMember.getUserId());
                    continue;
                }

                // 如果成员不在前端传来的列表中，且当前未被删除，则标记为软删除
                if (!receivedUserIds.contains(existingMember.getUserId()) && existingMember.getDeleted() == 0) {
                    log.info("成员不在前端列表中，将被软删除: userId={}, memberName={}",
                            existingMember.getUserId(), existingMember.getMemberName());

                    // 标记为已删除
                    existingMember.setDeleted(1);
                    existingMember.setDeletedAt(now);
                    existingMember.setUpdateAt(now);

                    // 添加到更新列表
                    newSavingsMembersList.add(existingMember);

                    // 记录需要删除存款记录的成员ID
                    deletedMemberIds.add(existingMember.getId());

                    // 构建VO
                    GroupSavingMemberVO vo = new GroupSavingMemberVO();
                    vo.setId(existingMember.getId())
                            .setUserId(existingMember.getUserId())
                            .setMemberName(existingMember.getMemberName())
                            .setAmount(existingMember.getAmount())
                            .setJoinTime(existingMember.getJoinedAt())
                            .setIsCreator(existingMember.getIsOwner())
                            .setDeleted(1)
                            .setDeletedAt(now);
                    newGroupSavingMemberVOList.add(vo);
                }
            }

            //2.2.4修改或插入成员
            for (SavingsMembers savingsMembers : newSavingsMembersList) {
                if (savingsMembers.getId() != null) {
                    // 有ID，说明是已存在的成员
                    if (savingsMembers.getDeleted() == 1) {
                        // ========== 关键修改：使用 UpdateWrapper 直接更新，同时设置 deleted 和 deleted_at ==========
                        // 确保 deletedAt 有值（如果之前没有设置，现在设置）
                        if (savingsMembers.getDeletedAt() == null) {
                            savingsMembers.setDeletedAt(LocalDateTime.now());
                        }

                        // 使用 UpdateWrapper 直接更新，绕过 @TableLogic 的自动处理
                        LambdaUpdateWrapper<SavingsMembers> deleteWrapper = new LambdaUpdateWrapper<>();
                        deleteWrapper.eq(SavingsMembers::getId, savingsMembers.getId())
                                .set(SavingsMembers::getDeleted, 1)
                                .set(SavingsMembers::getDeletedAt, savingsMembers.getDeletedAt())
                                .set(SavingsMembers::getUpdateAt, LocalDateTime.now());

                        int deleteResult = savingsMembersMapper.update(null, deleteWrapper);

                        if (deleteResult > 0) {
                            log.info("软删除成员成功: id={}, userId={}, deletedAt={}",
                                    savingsMembers.getId(),
                                    savingsMembers.getUserId(),
                                    savingsMembers.getDeletedAt());
                        } else {
                            log.warn("软删除成员失败: id={}, userId={}",
                                    savingsMembers.getId(),
                                    savingsMembers.getUserId());
                            // 如果更新失败，抛出异常触发事务回滚
                            throw new RuntimeException("软删除成员失败: id=" + savingsMembers.getId());
                        }
                    } else {
                        // 更新成员信息（包括将已删除的成员恢复）
                        LambdaUpdateWrapper<SavingsMembers> updateWrapper = new LambdaUpdateWrapper<>();
                        updateWrapper.eq(SavingsMembers::getId, savingsMembers.getId())
                                .set(SavingsMembers::getMemberName, savingsMembers.getMemberName())
                                .set(SavingsMembers::getAmount, savingsMembers.getAmount())
                                .set(SavingsMembers::getIsOwner, savingsMembers.getIsOwner())
                                .set(SavingsMembers::getUpdateAt, LocalDateTime.now())
                                .set(SavingsMembers::getDeleted, savingsMembers.getDeleted())
                                .set(SavingsMembers::getDeletedAt, savingsMembers.getDeletedAt());

                        int updateResult = savingsMembersMapper.update(null, updateWrapper);

                        if (updateResult > 0) {
                            log.info("更新成员成功: id={}, userId={}, deleted={}, deletedAt={}",
                                    savingsMembers.getId(),
                                    savingsMembers.getUserId(),
                                    savingsMembers.getDeleted(),
                                    savingsMembers.getDeletedAt());
                        } else {
                            log.warn("更新成员失败: id={}, userId={}",
                                    savingsMembers.getId(),
                                    savingsMembers.getUserId());
                            // 如果更新失败，尝试强制更新（作为备选方案）
                            int forceResult = savingsMembersMapper.forceUpdate(savingsMembers);
                            if (forceResult > 0) {
                                log.info("强制更新成员成功: id={}, userId={}, deleted={}, deletedAt={}",
                                        savingsMembers.getId(),
                                        savingsMembers.getUserId(),
                                        savingsMembers.getDeleted(),
                                        savingsMembers.getDeletedAt());
                            } else {
                                throw new RuntimeException("更新成员失败: id=" + savingsMembers.getId());
                            }
                        }
                    }
                } else {
                    // 没有ID，说明是新成员
                    savingsMembersMapper.insert(savingsMembers);
                    log.info("插入新成员: userId={}, name={}, deletedAt={}",
                            savingsMembers.getUserId(),
                            savingsMembers.getMemberName(),
                            savingsMembers.getDeletedAt());

                    // 插入后，MyBatis-Plus会自动回填ID，需要更新VO中的ID
                    for (GroupSavingMemberVO vo : newGroupSavingMemberVOList) {
                        if (vo.getUserId().equals(savingsMembers.getUserId())) {
                            vo.setId(savingsMembers.getId());
                            break;
                        }
                    }
                }
            }

            //2.3修改存款记录：只标记被软删除的成员的存款记录
            if (!deletedMemberIds.isEmpty()) {
                LambdaUpdateWrapper<SavingDepositRecords> updateWrapperToSavingDepositRecords = new LambdaUpdateWrapper<>();
                updateWrapperToSavingDepositRecords.eq(SavingDepositRecords::getGroupSavingId, id)
                        .in(SavingDepositRecords::getMemberId, deletedMemberIds)
                        .set(SavingDepositRecords::getDeleted, 1)
                        .set(SavingDepositRecords::getDeletedAt, LocalDateTime.now());

                savingDepositRecordsMapper.update(null, updateWrapperToSavingDepositRecords);
                log.info("标记存款记录为删除: 计划ID={}, 成员ID列表={}", id, deletedMemberIds);
            }

            //3计算进度
            int progress = 0;
            if (groupSaving.getTargetAmount() != null &&
                    groupSaving.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
                progress = groupSaving.getCurrentAmount()
                        .multiply(new BigDecimal(100))
                        .divide(groupSaving.getTargetAmount(), 0, BigDecimal.ROUND_HALF_UP)
                        .intValue();
            }

            // 4. 组装响应
            GroupSavingVO vo = new GroupSavingVO();
            vo.setId(id)
                    .setName(groupSaving.getName())
                    .setDescription(groupSaving.getDescription())
                    .setReason(groupSaving.getReason())
                    .setTargetAmount(groupSaving.getTargetAmount())
                    .setCurrentAmount(groupSaving.getCurrentAmount())
                    .setDeadline(groupSaving.getDeadline())
                    .setType(groupSaving.getType())
                    .setProgress(progress)
                    .setStatus(groupSaving.getStatus())
                    .setCreatorId(groupSaving.getCreatedBy())
                    .setCreateTime(groupSaving.getCreatedAt())
                    .setUpdateTime(groupSaving.getUpdatedAt())
                    .setMembers(newGroupSavingMemberVOList)
                    .setDeleted(groupSaving.getDeleted())
                    .setDeletedAt(groupSaving.getDeletedAt());

            return RespBean.success(RespCode.SUCCESS, "修改成功", vo);

        } catch (Exception e) {
            log.error("修改多人存钱计划失败 - 计划ID: {}, 错误信息: {}", id, e.getMessage(), e);
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
        //1.查询计划是否存在且未删除
        GroupSavings groupSavings = groupSavingsMapper.selectOne(
                new LambdaQueryWrapper<GroupSavings>()
                        .eq(GroupSavings::getId, id)
        );
        if (groupSavings == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "计划不存在或已删除");
        }

        //2.查询成员是否存在且未删除
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

        //根据用户id和计划id查询对应的存钱成员信息
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

        //2.软删除对应计划
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

            //2.2查询新的创建者是否是存钱计划的一员
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
        //2.根据计划id获取成员
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
            // 使用自定义方法查询成员，包含已退出的
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
        //1.查询计划是否存在且未删除
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
                .setDeleted(record.getDeleted())
                .setDeletedAt(record.getDeletedAt());

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
                .setDeleted(group.getDeleted())
                .setDeletedAt(group.getDeletedAt());

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
                .setDeleted(member.getDeleted())
                .setDeletedAt(member.getDeletedAt());
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

        // 关键：手动设置软删除字段
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