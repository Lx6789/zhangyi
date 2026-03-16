package org.lx.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * @Title: MyMetaObjectHandler
 * @Author: MrLu2
 * @Package: org.lx.config.security
 * @Date: 2026/3/11 11:49
 * @Description: MyBatis-Plus 自动填充处理器
 */
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();

        // 创建时间填充
        this.setFieldValByName("createdAt", now, metaObject);
        this.setFieldValByName("joinedAt", now, metaObject);
        this.setFieldValByName("depositTime", now, metaObject);

        // 更新时间填充（创建时也设置初始值）
        this.setFieldValByName("updatedAt", now, metaObject);
        this.setFieldValByName("updateAt", now, metaObject);

        // 逻辑删除标记默认值（如果有需要）
        this.setFieldValByName("deleted", 0, metaObject);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();

        // 更新时间填充
        this.setFieldValByName("updatedAt", now, metaObject);
        this.setFieldValByName("updateAt", now, metaObject);

        // 检查是否有 deleted 字段被设置为 1（即将被逻辑删除）
        Object deleted = this.getFieldValByName("deleted", metaObject);
        if (deleted != null && (deleted.equals(1) || deleted.equals(1L))) {
            // 如果 deleted 被设置为 1，则自动填充 deleted_at
            this.setFieldValByName("deletedAt", now, metaObject);
        }
    }
}