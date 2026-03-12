// src/api/saving.js

/**
 * 多人存钱计划接口
 */

// ==================== 多人存钱计划 ====================

/**
 * 获取多人存钱计划列表
 */
export const getGroupSavingList = (params) => ({
    url: '/savings/group/list',
    method: 'GET',
    params
})

/**
 * 获取多人存钱计划详情
 */
export const getGroupSavingDetail = (id) => ({
    url: `/savings/group/${id}`,
    method: 'GET'
})

/**
 * 创建多人存钱计划
 */
export const createGroupSaving = (data) => ({
    url: '/savings/group/create',
    method: 'POST',
    data
})

/**
 * 更新多人存钱计划
 */
export const updateGroupSaving = (id, data) => ({
    url: `/savings/group/${id}`,
    method: 'PUT',
    data
})

/**
 * 删除多人存钱计划
 */
export const deleteGroupSaving = (id) => ({
    url: `/savings/group/${id}`,
    method: 'DELETE'
})

/**
 * 加入多人存钱计划
 */
export const joinGroupSaving = (id, data) => ({
    url: `/savings/group/${id}/join`,
    method: 'POST',
    data
})

/**
 * 退出多人存钱计划
 */
export const leaveGroupSaving = (id, data) => ({
    url: `/savings/group/${id}/leave`,
    method: 'POST',
    data
})

/**
 * 多人存钱 - 存钱
 */
export const depositToGroupSaving = (id, data) => ({
    url: `/savings/group/${id}/deposit`,
    method: 'POST',
    data
})

/**
 * 获取计划的所有存钱记录（POST方式，支持复杂查询）
 */
export const getSavingRecordsByPost = (id, data) => ({
    url: `/savings/group/${id}/records`,
    method: 'POST',
    data
})

/**
 * 获取成员的存钱记录
 */
export const getMemberSavingRecords = (planId, memberId) => ({
    url: `/savings/group/${planId}/member/${memberId}/records`,
    method: 'GET'
})

/**
 * 更新成员存款金额
 */
export const updateGroupSavingMember = (planId, memberId, data) => ({
    url: `/savings/group/${planId}/member/${memberId}`,
    method: 'PUT',
    data
})

// ==================== 个人存钱计划 ====================

/**
 * 获取个人存钱计划列表
 */
export const getPersonalSavingList = (params) => ({
    url: '/savings/personal/list',
    method: 'GET',
    params
})

/**
 * 创建个人存钱计划
 */
export const createPersonalSaving = (data) => ({
    url: '/savings/personal/create',
    method: 'POST',
    data
})

/**
 * 更新个人存钱计划
 */
export const updatePersonalSaving = (id, data) => ({
    url: `/savings/personal/${id}`,
    method: 'PUT',
    data
})

/**
 * 删除个人存钱计划
 */
export const deletePersonalSaving = (id) => ({
    url: `/savings/personal/${id}`,
    method: 'DELETE'
})

/**
 * 个人存钱 - 存钱
 */
export const depositToPersonalSaving = (id, data) => ({
    url: `/savings/personal/${id}/deposit`,
    method: 'POST',
    data
})