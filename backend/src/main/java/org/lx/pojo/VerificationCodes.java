package org.lx.pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 登录验证码表 - 存储短信验证码信息
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("verification_codes")
@ApiModel(value="VerificationCodes对象", description="登录验证码表 - 存储短信验证码信息")
public class VerificationCodes implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "验证码ID，主键，自增")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty(value = "接收验证码的手机号")
    private String phone;

    @ApiModelProperty(value = "验证码内容（6位）")
    private String code;

    @ApiModelProperty(value = "验证码类型（register-注册，login-登录，reset-重置密码等）")
    private String type;

    @ApiModelProperty(value = "请求ID，用于标识一次验证码请求")
    @TableField("request_id")
    private String requestId;

    @ApiModelProperty(value = "验证码过期时间")
    @TableField("expires_at")
    private LocalDateTime expiresAt;

    @ApiModelProperty(value = "是否已使用，默认未使用")
    private Boolean used;

    @ApiModelProperty(value = "创建时间")
    @TableField("created_at")
    private LocalDateTime createdAt;


}
