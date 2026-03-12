// captcha-helper.service.js - 修复导入问题
import { authService } from '@/services/index.js'
import formHelperService from './form-helper.service.js'

class CaptchaHelperService {
    /**
     * 创建一个验证码管理器
     * @param {Object} options - 配置选项
     * @returns {Object} 验证码管理器实例
     */
    createManager(options = {}) {
        const {
            autoLoad = true,      // 创建时是否自动加载
            onLoaded = null,      // 加载完成回调
            onError = null       // 加载失败回调
        } = options

        const manager = {
            // 状态
            image: null,
            key: null,
            loading: false,
            error: null,

            // 标识符（用于调试）
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),

            /**
             * 加载验证码
             * @param {boolean} forceRefresh - 是否强制刷新
             */
            async load(forceRefresh = false) {
                // 如果已经在加载中，避免重复请求
                if (this.loading && !forceRefresh) {
                    console.log(`验证码管理器 ${this.id} 正在加载中，跳过重复请求`)
                    return
                }

                // 强制刷新时清除旧数据
                if (forceRefresh) {
                    this.clear()
                }

                this.loading = true
                this.error = null

                try {
                    console.log(`验证码管理器 ${this.id} 开始加载验证码...`)

                    // 调用验证码生成API
                    const response = await authService.generateCaptcha()
                    console.log(`验证码管理器 ${this.id} 响应:`, response)

                    // 处理不同的响应格式
                    if (response && response.image && response.captchaKey) {
                        // 直接包含必要字段
                        this.image = response.image
                        this.key = response.captchaKey
                    } else if (response && response.data) {
                        // 包含 data 对象
                        this.image = response.data.image
                        this.key = response.data.captchaKey
                    } else if (response && response.code === 200 && response.data) {
                        // 完整响应格式
                        this.image = response.data.image
                        this.key = response.data.captchaKey
                    } else {
                        throw new Error('验证码数据格式异常: ' + JSON.stringify(response))
                    }

                    console.log(`验证码管理器 ${this.id} 加载成功`)

                    // 触发回调
                    if (onLoaded && typeof onLoaded === 'function') {
                        onLoaded(this.image, this.key)
                    }

                } catch (error) {
                    console.error(`验证码管理器 ${this.id} 加载失败:`, error)
                    this.error = error.message || '加载验证码失败'

                    // 显示错误通知
                    formHelperService.showNotification('加载验证码失败，请重试', 'error')

                    // 触发错误回调
                    if (onError && typeof onError === 'function') {
                        onError(error)
                    }
                } finally {
                    this.loading = false
                }
            },

            /**
             * 刷新验证码（强制重新加载）
             */
            async refresh() {
                console.log(`验证码管理器 ${this.id} 刷新验证码`)
                await this.load(true)
            },

            /**
             * 获取验证码数据
             * @returns {Object} 包含 image 和 key 的对象
             */
            getData() {
                return {
                    image: this.image,
                    key: this.key,
                    loading: this.loading,
                    error: this.error
                }
            },

            /**
             * 获取验证码图像
             * @returns {string|null} 验证码图片的base64数据
             */
            getImage() {
                return this.image
            },

            /**
             * 获取验证码密钥
             * @returns {string|null} 验证码密钥
             */
            getKey() {
                return this.key
            },

            /**
             * 清除验证码数据
             */
            clear() {
                this.image = null
                this.key = null
                this.error = null
                console.log(`验证码管理器 ${this.id} 数据已清除`)
            },

            /**
             * 检查是否已加载
             * @returns {boolean}
             */
            isLoaded() {
                return !!this.image && !!this.key
            },

            /**
             * 检查是否正在加载
             * @returns {boolean}
             */
            isLoading() {
                return this.loading
            },

            /**
             * 检查是否有错误
             * @returns {boolean}
             */
            hasError() {
                return !!this.error
            }
        }

        // 自动加载
        if (autoLoad) {
            setTimeout(() => {
                manager.load()
            }, 100)
        }

        return manager
    }

    /**
     * 快速创建验证码管理器（简化版）
     * @param {Object} formRef - 表单引用（可选，用于清空验证码输入）
     * @returns {Object} 验证码管理器
     */
    quickManager(formRef = null) {
        return this.createManager({
            onLoaded: () => {
                console.log('验证码加载完成')
                // 如果提供了表单引用，清空验证码输入
                if (formRef && formRef.captcha !== undefined) {
                    formRef.captcha = ''
                }
            },
            onError: (error) => {
                console.error('验证码加载错误:', error)
            }
        })
    }
}

export default new CaptchaHelperService()