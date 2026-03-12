package org.lx.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.lx.pojo.VerificationCodes;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * 登录验证码表 - 存储短信验证码信息 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Mapper
public interface VerificationCodesMapper extends BaseMapper<VerificationCodes> {

}
