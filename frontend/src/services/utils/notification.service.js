/**
 * 通知服务
 */
class NotificationService{
    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        // 移除现有通知
        const existingNotification = document.querySelector('.notification')
        if (existingNotification) {
            document.body.removeChild(existingNotification)
        }

        // 创建通知元素
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 3000;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 90%;
            text-align: center;
        `
        notification.textContent = message
        document.body.appendChild(notification)

        // 显示通知
        setTimeout(() => {
            notification.style.opacity = '1'
        }, 10)

        // 自动隐藏
        setTimeout(() => {
            notification.style.opacity = '0'
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification)
                }
            }, 300)
        }, 3000)
    }

    /**
     * 获取通知颜色
     */
    getNotificationColor(type) {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        }
        return colors[type] || '#3498db'
    }
}

export default new NotificationService()
