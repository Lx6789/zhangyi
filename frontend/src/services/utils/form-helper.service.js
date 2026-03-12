/**
 * 表单辅助服务
 */
class FormHelperService {

    /**
     * 清空表单
     */
    clearForm(messages) {
        Object.keys(messages).forEach(key => {
            const value = messages[key]

            switch (typeof value) {
                case 'boolean':
                    messages[key] = false
                    break
                case 'string':
                    messages[key] = ''
                    break
                case 'number':
                    messages[key] = 0
                    break
                case 'object':
                    // 处理数组和普通对象
                    messages[key] = Array.isArray(value) ? [] : {}
                    break
                default:
                    messages[key] = null
            }
        })
    }

    /**
     * 设置表单错误
     */
    setFormError(errors, field, message) {
        if (errors[field] !== undefined) {
            errors[field] = message
        }
    }
}

export default new FormHelperService()