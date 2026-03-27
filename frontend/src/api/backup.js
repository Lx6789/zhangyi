// src/api/backup.js

import request from "@/services/utils/http-interceptor.js";
import { API } from "@/api/constants.js";

/**
 * 云端备份 API
 */

/**
 * 上传备份数据
 * @param {Object} data - 备份数据
 * @param {number} data.userId - 用户ID
 * @param {string} data.backupTime - 备份时间 ISO 8601 格式
 * @param {number} data.dataSize - 数据大小（字节）
 * @param {Array<string>} data.dataTypes - 包含的数据类型列表
 * @param {string} data.note - 备份备注
 * @param {Object} data.data - 备份的具体数据内容
 * @returns {Promise<Object>} 返回备份ID
 */
export async function uploadBackup(data) {
    console.log('【API】上传云端备份，数据大小:', data.dataSize);
    try {
        const response = await request.post(API.BACKUP.UPLOAD, data);
        console.log('【API】上传备份响应:', response);
        return response;
    } catch (error) {
        console.error('【API】上传备份失败:', error);
        throw error;
    }
}

/**
 * 获取备份列表
 * @param {Object} params - 查询参数
 * @param {number} params.userId - 用户ID
 * @param {number} params.page - 页码（可选，默认1）
 * @param {number} params.size - 每页数量（可选，默认20）
 * @returns {Promise<Object>} 返回备份列表
 */
export async function getBackupList(params) {
    console.log('【API】获取备份列表，用户ID:', params.userId);
    try {
        const response = await request.get(API.BACKUP.LIST, params);
        console.log('【API】获取备份列表响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取备份列表失败:', error);
        throw error;
    }
}

/**
 * 获取备份详情
 * @param {string} backupId - 备份ID
 * @returns {Promise<Object>} 返回备份详情
 */
export async function getBackupDetail(backupId) {
    console.log('【API】获取备份详情，ID:', backupId);
    try {
        const url = API.BACKUP.DETAIL.replace('{backupId}', backupId);
        const response = await request.get(url);
        console.log('【API】获取备份详情响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取备份详情失败:', error);
        throw error;
    }
}

/**
 * 恢复备份数据
 * @param {string} backupId - 备份ID
 * @returns {Promise<Object>} 返回恢复结果
 */
export async function restoreBackup(backupId) {
    console.log('【API】恢复备份，ID:', backupId);
    try {
        const url = API.BACKUP.RESTORE.replace('{backupId}', backupId);
        const response = await request.post(url);
        console.log('【API】恢复备份响应:', response);
        return response;
    } catch (error) {
        console.error('【API】恢复备份失败:', error);
        throw error;
    }
}

/**
 * 删除备份
 * @param {string} backupId - 备份ID
 * @returns {Promise<Object>} 返回删除结果
 */
export async function deleteBackup(backupId) {
    console.log('【API】删除备份，ID:', backupId);
    try {
        const url = API.BACKUP.DELETE.replace('{backupId}', backupId);
        const response = await request.delete(url);
        console.log('【API】删除备份响应:', response);
        return response;
    } catch (error) {
        console.error('【API】删除备份失败:', error);
        throw error;
    }
}

/**
 * 获取备份统计信息
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 返回统计信息
 */
export async function getBackupStats(userId) {
    console.log('【API】获取备份统计，用户ID:', userId);
    try {
        const response = await request.get(API.BACKUP.STATS, { userId });
        console.log('【API】获取备份统计响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取备份统计失败:', error);
        throw error;
    }
}

/**
 * 获取用户备份数量
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 返回备份数量
 */
export async function getBackupCount(userId) {
    console.log('【API】获取备份数量，用户ID:', userId);
    try {
        const response = await request.get(API.BACKUP.COUNT, { userId });
        console.log('【API】获取备份数量响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取备份数量失败:', error);
        throw error;
    }
}