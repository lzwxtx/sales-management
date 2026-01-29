/**
 * 跨标签页数据同步管理器
 * 使用 BroadcastChannel API 实现实时数据同步
 */
class SyncManager {
    constructor() {
        this.channel = new BroadcastChannel('salesDB_sync');
        this.listeners = new Set();
        this.isInitialized = false;
    }

    /**
     * 初始化同步管理器
     * @param {Function} callback - 接收消息的回调函数
     */
    init(callback) {
        if (this.isInitialized) return;

        this.channel.onmessage = (event) => {
            const { action, data, timestamp, senderId } = event.data;

            // 忽略自己发送的消息(可选,用于调试)
            // if (senderId === this.senderId) return;

            console.log('[SyncManager] 收到同步消息:', { action, timestamp });

            // 通知所有监听器
            this.listeners.forEach(listener => {
                try {
                    listener({ action, data, timestamp });
                } catch (error) {
                    console.error('[SyncManager] 监听器执行错误:', error);
                }
            });

            // 执行主回调
            if (callback) {
                callback({ action, data, timestamp });
            }
        };

        this.isInitialized = true;
        console.log('[SyncManager] 同步管理器已初始化');
    }

    /**
     * 广播数据变更
     * @param {string} action - 操作类型 (如 'ADD_PRODUCT', 'UPDATE_PRODUCT')
     * @param {any} data - 变更的数据
     */
    broadcast(action, data) {
        const message = {
            action,
            data,
            timestamp: Date.now(),
            senderId: this.senderId || 'unknown'
        };

        try {
            this.channel.postMessage(message);
            console.log('[SyncManager] 广播消息:', action);
        } catch (error) {
            console.error('[SyncManager] 广播失败:', error);
        }
    }

    /**
     * 添加消息监听器
     * @param {Function} listener - 监听器函数
     */
    addListener(listener) {
        this.listeners.add(listener);
    }

    /**
     * 移除消息监听器
     * @param {Function} listener - 监听器函数
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    /**
     * 清理资源
     */
    destroy() {
        this.channel.close();
        this.listeners.clear();
        this.isInitialized = false;
        console.log('[SyncManager] 同步管理器已销毁');
    }
}

// 导出单例
export const syncManager = new SyncManager();
