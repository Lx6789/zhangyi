package org.lx.service;

import org.lx.common.RespBean;
import org.lx.pojo.Users;
import com.baomidou.mybatisplus.extension.service.IService;
import org.lx.pojo.dto.LoginDTO;
import org.lx.pojo.dto.RegisterDTO;
import org.lx.pojo.dto.SecurityQuestionDTO;

import javax.servlet.http.HttpServletRequest;

/**
 * <p>
 * 用户表 - 存储系统用户基本信息 服务类
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
public interface IUsersService extends IService<Users> {

    /**
     * 登录之后返回token
     * @param loginVO
     * @param request
     * @return
     */
    RespBean login(LoginDTO loginVO, HttpServletRequest request);

    /**
     * 根据电话获取用户
     * @param phone
     * @return
     */
    Users getUserByPhone(String phone);

    /**
     * 注册用户
     * @param registerDTO
     * @return
     */
    RespBean register(RegisterDTO registerDTO);

    /**
     * 获取安全问题
     * @param securityQuestionDTO
     * @return
     */
    RespBean getSecurityQuestion(SecurityQuestionDTO securityQuestionDTO);

    /**
     * 验证安全问题
     * @param securityQuestionDTO
     * @return
     */
    RespBean verifySecurityAnswer(SecurityQuestionDTO securityQuestionDTO);

    /**
     * 重置密码
     * @param securityQuestionDTO
     * @return
     */
    RespBean resetPassword(SecurityQuestionDTO securityQuestionDTO);
}
