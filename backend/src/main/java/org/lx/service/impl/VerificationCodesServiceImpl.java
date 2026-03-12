package org.lx.service.impl;

import org.lx.pojo.VerificationCodes;
import org.lx.mapper.VerificationCodesMapper;
import org.lx.service.IVerificationCodesService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 登录验证码表 - 存储短信验证码信息 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Service
public class VerificationCodesServiceImpl extends ServiceImpl<VerificationCodesMapper, VerificationCodes> implements IVerificationCodesService {

}
