/**
 * 版本管理相关接口定义
 * 只包含API调用函数，不包含业务逻辑
 */
import request from "@/services/utils/http-interceptor.js";
import { API } from './constants';

/**
 * 获取最新版本信息
 * @returns {Promise} 最新版本信息
 */
export async function getLatestVersion() {
    console.log('【API】开始获取最新版本信息');
    try {
        // ✅ 直接发送请求，而不是返回配置对象
        const response = await request.get(API.VERSION.LATEST);
        console.log('【API】获取最新版本信息响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取最新版本信息失败:', error);
        throw error;
    }
}

/**
 * 检查版本更新（后端比较版本）
 * @param {Object} params - 包含当前版本号
 * @returns {Promise} 更新信息
 */
export async function checkVersion(params) {
    console.log('【API】开始检查版本更新，参数:', params);
    try {
        const response = await request.get(API.VERSION.CHECK, params);
        console.log('【API】检查版本更新响应:', response);
        return response;
    } catch (error) {
        console.error('【API】检查版本更新失败:', error);
        throw error;
    }
}

/**
 * 上传APK版本（管理端使用）
 * @param {FormData} formData - 包含文件和其他版本信息
 * @returns {Promise} 上传结果
 */
export async function uploadVersion(formData) {
    console.log('【API】开始上传APK版本');
    try {
        const response = await request.upload(API.VERSION.UPDATE, formData.get('file'), 'file', {
            data: formData
        });
        console.log('【API】上传APK版本响应:', response);
        return response;
    } catch (error) {
        console.error('【API】上传APK版本失败:', error);
        throw error;
    }
}

/**
 * 获取版本列表（管理端使用）
 * @param {Object} params - 分页参数
 * @returns {Promise} 版本列表
 */
export async function getVersionList(params) {
    console.log('【API】开始获取版本列表，参数:', params);
    try {
        const response = await request.get(API.VERSION.LIST, params);
        console.log('【API】获取版本列表响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取版本列表失败:', error);
        throw error;
    }
}

/**
 * 获取版本详情
 * @param {number} versionId - 版本ID
 * @returns {Promise} 版本详情
 */
export async function getVersionDetail(versionId) {
    const url = API.VERSION.DETAIL.replace('{versionId}', versionId);
    console.log('【API】开始获取版本详情，URL:', url);
    try {
        const response = await request.get(url);
        console.log('【API】获取版本详情响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取版本详情失败:', error);
        throw error;
    }
}

/**
 * 删除版本（管理端使用）
 * @param {number} versionId - 版本ID
 * @returns {Promise} 删除结果
 */
export async function deleteVersion(versionId) {
    const url = API.VERSION.DELETE.replace('{versionId}', versionId);
    console.log('【API】开始删除版本，URL:', url);
    try {
        const response = await request.delete(url);
        console.log('【API】删除版本响应:', response);
        return response;
    } catch (error) {
        console.error('【API】删除版本失败:', error);
        throw error;
    }
}

/**
 * 获取下载URL
 * @param {number} versionId - 版本ID
 * @returns {string} 下载URL
 */
export function getDownloadUrl(versionId) {
    return API.VERSION.DOWNLOAD.replace('{versionId}', versionId);
}