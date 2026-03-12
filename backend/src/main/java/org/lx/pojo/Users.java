package org.lx.pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import java.util.Collection;
import java.util.Collections;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * <p>
 * 用户表 - 存储系统用户基本信息
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("users")
@ApiModel(value="Users对象", description="用户表 - 存储系统用户基本信息")
public class Users implements Serializable, UserDetails {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "用户ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "手机号，唯一约束")
    private String phone;

    @ApiModelProperty(value = "邮箱地址")
    private String email;

    @ApiModelProperty(value = "加密后的密码")
    private String passwordHash;

    @ApiModelProperty(value = "用户名")
    private String username;

    @ApiModelProperty(value = "头像URL")
    private String avatar;

    @ApiModelProperty(value = "创建时间，默认当前时间")
    @TableField("created_at")
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间，更新时自动设置为当前时间")
    @TableField("updated_at")
    private LocalDateTime updatedAt;

    @ApiModelProperty(value = "是否启用（0：启用，1：禁用）")
    @TableField("status")
    private Integer status;

    @ApiModelProperty(value = "Token 中使用的 username（手机号）")
    @TableField(exist = false)
    private String tokenUsername;

    @ApiModelProperty(value = "安全问题字段")
    private String securityQuestion;

    @ApiModelProperty(value = "安全问题答案的hash值")
    private String securityAnswerHash;

    @ApiModelProperty(value = "安全问题答案的hash值的盐")
    private String securityAnswerSalt;

    @ApiModelProperty(value = "安全问题设置的时间")
    private LocalDateTime securitySetTime;

    /**
     * 权限
     * @return
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    @Override
    public String getPassword() {
        return getPasswordHash();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == 0;
    }

    @Override
    public String getUsername() {
        // 优先返回 tokenUsername（手机号），用于安全认证
        return this.tokenUsername != null ? this.tokenUsername : this.username;
    }

    // 添加获取显示用户名的方法
    public String getDisplayUsername() {
        return this.username; // 返回数据库中的 username（昵称）
    }

    public Users setTokenUsername(String tokenUsername) {
        this.tokenUsername = tokenUsername;
        return this;
    }
}
