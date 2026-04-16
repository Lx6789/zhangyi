/**
 * APK 更新服务
 * 用于 Capacitor 打包的 APK 应用内更新
 */
import { Filesystem, Directory } from '@capacitor/filesystem'
import { App } from '@capacitor/app'
import notificationService from './utils/notification.service'

// 检测是否在 Capacitor 环境中
const isCapacitor = () => {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
}

class ApkUpdateService {
    constructor() {
        this.downloadPath = null
    }

    /**
     * 下载并安装 APK
     * @param {string} downloadUrl - 下载地址
     * @param {Object} options - 配置选项
     */
    async downloadAndInstall(downloadUrl, options = {}) {
        const {
            onProgress,
            onSuccess,
            onError,
            versionName = ''
        } = options

        if (!isCapacitor()) {
            console.warn('不在 Capacitor 环境中，使用浏览器下载')
            return this.browserDownload(downloadUrl, versionName)
        }

        let loadingNotification = null

        try {
            // 显示下载进度提示
            loadingNotification = notificationService.showLoading(`正在下载 ${versionName}... 0%`)

            // 发起下载请求
            const response = await fetch(downloadUrl)

            if (!response.ok) {
                throw new Error(`下载失败: ${response.status}`)
            }

            // 获取文件大小
            const contentLength = response.headers.get('content-length')
            const total = parseInt(contentLength, 10)
            let loaded = 0
            let lastProgress = 0

            // 读取数据流
            const reader = response.body.getReader()
            const chunks = []

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                chunks.push(value)
                loaded += value.length

                // 计算进度百分比
                if (total) {
                    const progress = Math.round((loaded / total) * 100)
                    if (progress - lastProgress >= 5 || progress === 100) {
                        lastProgress = progress
                        if (loadingNotification && loadingNotification.updateMessage) {
                            loadingNotification.updateMessage(`正在下载 ${versionName}... ${progress}%`)
                        }
                        if (onProgress) onProgress(progress)
                    }
                }
            }

            // 合并数据块
            const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' })

            // 转换为 base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })

            // 提取 base64 数据（去掉 data:application/...;base64, 前缀）
            const base64Data = base64.split(',')[1]

            // 保存到设备
            const fileName = `zhangyi_v${versionName}.apk`
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
                recursive: true
            })

            this.downloadPath = savedFile.uri

            // 关闭加载提示
            if (loadingNotification && loadingNotification.close) {
                loadingNotification.close()
            }

            notificationService.showNotification('下载完成，正在准备安装...', 'success')

            // 打开 APK 文件（触发安装）
            await this.installApk(savedFile.uri)

            if (onSuccess) onSuccess()

        } catch (error) {
            console.error('下载APK失败:', error)
            if (loadingNotification && loadingNotification.close) {
                loadingNotification.close()
            }
            notificationService.showNotification('下载失败，请稍后重试', 'error')
            if (onError) onError(error)
        }
    }

    /**
     * 安装 APK（Android）
     * @param {string} fileUri - 文件路径
     */
    async installApk(fileUri) {
        try {
            // 使用 Capacitor App 插件打开文件
            await App.openUrl({ url: fileUri })
        } catch (error) {
            console.error('打开APK失败:', error)
            notificationService.showNotification('请手动安装下载的APK文件', 'warning')
        }
    }

    /**
     * 浏览器环境下载（备用）
     */
    browserDownload(downloadUrl, versionName) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `zhangyi_v${versionName}.apk`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        notificationService.showNotification('下载已开始，请手动安装', 'success')
    }

    /**
     * 清理缓存文件
     */
    async clearCache() {
        if (this.downloadPath && isCapacitor()) {
            try {
                await Filesystem.deleteFile({
                    path: this.downloadPath,
                    directory: Directory.Cache
                })
                console.log('缓存文件已清理')
            } catch (error) {
                console.error('清理缓存失败:', error)
            }
        }
    }
}

export default new ApkUpdateService()