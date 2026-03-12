// services/sync-manager.service.js
class SyncManager {
    constructor() {
        this.syncQueue = []  // 待同步的操作
        this.syncing = false
    }

    // 添加操作到同步队列
    async addOperation(operation) {
        operation.id = Date.now()
        operation.status = 'pending'
        this.syncQueue.push(operation)

        // 保存到 IndexedDB
        await this.saveToQueue(operation)

        // 如果在线，立即尝试同步
        if (navigator.onLine) {
            this.startSync()
        }
    }

    // 开始同步
    async startSync() {
        if (this.syncing || this.syncQueue.length === 0) return

        this.syncing = true

        try {
            // 获取所有待同步的操作
            const pendingOps = this.syncQueue.filter(op => op.status === 'pending')

            for (const op of pendingOps) {
                try {
                    // 发送到服务器
                    const result = await this.sendToServer(op)

                    // 标记为已同步
                    op.status = 'synced'
                    await this.updateQueueStatus(op.id, 'synced')

                    // 从队列中移除（可选）
                    this.syncQueue = this.syncQueue.filter(o => o.id !== op.id)
                } catch (error) {
                    // 失败标记为重试
                    op.status = 'failed'
                    op.retryCount = (op.retryCount || 0) + 1
                    await this.updateQueueStatus(op.id, 'failed')
                }
            }
        } finally {
            this.syncing = false

            // 如果还有失败的，稍后重试
            if (this.syncQueue.some(op => op.status === 'failed')) {
                setTimeout(() => this.startSync(), 30000) // 30秒后重试
            }
        }
    }

    // 简化的冲突解决
    resolveConflict(local, server) {
        // 简单策略：以时间戳较新的为准
        return new Date(local.timestamp) > new Date(server.timestamp)
            ? local
            : server
    }
}

export default new SyncManager()