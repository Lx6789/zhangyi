/**
 * 加密服务
 * 用于敏感数据的加密存储
 */
class EncryptionService {
    constructor() {
        this.encoder = new TextEncoder()
        this.decoder = new TextDecoder()
    }

    /**
     * 生成加密密钥
     */
    async generateKey(secret) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            this.encoder.encode(secret),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        )

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: this.encoder.encode('finance-salt'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        )
    }

    /**
     * 加密数据
     */
    async encrypt(data, secret) {
        try {
            const key = await this.generateKey(secret)
            const iv = crypto.getRandomValues(new Uint8Array(12))
            const encoded = this.encoder.encode(JSON.stringify(data))

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encoded
            )

            return {
                data: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv)
            }
        } catch (error) {
            console.error('加密失败:', error)
            throw error
        }
    }

    /**
     * 解密数据
     */
    async decrypt(encryptedData, secret) {
        try {
            const key = await this.generateKey(secret)
            const iv = new Uint8Array(encryptedData.iv)
            const data = new Uint8Array(encryptedData.data)

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            )

            return JSON.parse(this.decoder.decode(decrypted))
        } catch (error) {
            console.error('解密失败:', error)
            throw error
        }
    }

    /**
     * 简单哈希（用于非关键数据）
     */
    simpleHash(str) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash
        }
        return hash.toString(36)
    }
}

export default new EncryptionService()