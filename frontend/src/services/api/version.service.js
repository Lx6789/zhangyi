/**
 * 版本管理服务
 * 负责检查应用更新和管理本地版本信息
 */
import localStorageService from '@/services/local-storage.service'
import versionConfig from '@/config/version'
import * as versionApi from '@/api/version'
import apkUpdateService from '@/services/apk-update.service'

const VERSION_STORAGE_KEY = 'app_version'

class VersionService {
    constructor() {
        this.currentVersion = null
        this.latestVersion = null
        this.appVersionCode = versionConfig.versionCode
        this.appVersionName = versionConfig.versionName
        this.init()
    }

    init() {
        const savedVersion = localStorageService.get(VERSION_STORAGE_KEY)
        if (savedVersion) {
            this.currentVersion = savedVersion
        } else {
            this.currentVersion = {
                versionCode: this.appVersionCode,
                versionName: this.appVersionName,
                updatedAt: new Date().toISOString()
            }
            localStorageService.set(VERSION_STORAGE_KEY, this.currentVersion)
        }
    }

    getAppVersion() {
        return {
            versionCode: this.appVersionCode,
            versionName: this.appVersionName
        }
    }

    getCurrentVersion() {
        return this.currentVersion
    }

    setCurrentVersion(versionCode, versionName) {
        this.currentVersion = {
            versionCode,
            versionName,
            updatedAt: new Date().toISOString()
        }
        localStorageService.set(VERSION_STORAGE_KEY, this.currentVersion)
    }

    clearVersion() {
        this.currentVersion = {
            versionCode: this.appVersionCode,
            versionName: this.appVersionName,
            updatedAt: new Date().toISOString()
        }
        localStorageService.set(VERSION_STORAGE_KEY, this.currentVersion)
    }

    async fetchLatestVersion() {
        try {
            console.log('【版本检查】开始请求后端...')
            const data = await versionApi.getLatestVersion()
            console.log('【版本检查】后端返回:', data)
            this.latestVersion = data
            return data
        } catch (error) {
            console.error('【版本检查】获取最新版本失败:', error)
            return null
        }
    }

    async checkUpdate() {
        try {
            const latest = await this.fetchLatestVersion()

            if (!latest) {
                return {
                    needUpdate: false,
                    message: '获取版本信息失败'
                }
            }

            const needUpdate = latest.versionCode > this.appVersionCode
            console.log('【版本检查】当前版本:', this.appVersionCode, '最新版本:', latest.versionCode, '需要更新:', needUpdate)

            return {
                needUpdate: needUpdate,
                latestVersion: latest,
                currentVersion: {
                    versionCode: this.appVersionCode,
                    versionName: this.appVersionName
                },
                updateContent: latest.updateContent,
                downloadUrl: latest.downloadUrl,
                isForceUpdate: latest.isForceUpdate || false,
                fileSize: latest.fileSize,
                md5: latest.md5
            }
        } catch (error) {
            console.error('检查版本更新失败:', error)
            return {
                needUpdate: false,
                error: error.message
            }
        }
    }

    /**
     * 下载并安装APK（使用 Capacitor）
     */
    async downloadAndInstall(downloadUrl, options = {}) {
        return apkUpdateService.downloadAndInstall(downloadUrl, options)
    }

    getDownloadUrl(versionId) {
        return versionApi.getDownloadUrl(versionId)
    }
}

export default new VersionService()