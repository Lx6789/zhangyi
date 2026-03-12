package org.lx.controller;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.config.CaptchaUtil;
import org.lx.pojo.Users;
import org.lx.pojo.dto.CaptchaDTO;
import org.lx.pojo.dto.LoginDTO;
import org.lx.pojo.dto.RegisterDTO;
import org.lx.pojo.dto.SecurityQuestionDTO;
import org.lx.service.IUsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.security.Principal;

/**
 * @Title: AuthController
 * @Author: MrLu2
 * @Package: org.lx.controller
 * @Date: 2026/1/8 23:07
 * @Description: 用户认证相关
 */
@Api(tags = "用户认证相关接口")
@RestController
@Slf4j
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private IUsersService usersService;

    @Autowired
    private CaptchaUtil captchaUtil;

    @ApiOperation(value = "登录之后返回token")
    @PostMapping("/login")
    public RespBean login(@RequestBody LoginDTO loginVO, HttpServletRequest request) {
        log.info(loginVO.toString());
        return usersService.login(loginVO, request);
    }

    @ApiOperation(value = "退出登录")
    @PostMapping("/logout")
    private RespBean logout() {
        return RespBean.success(RespCode.SUCCESS, "退出成功");
    }

    @ApiOperation(value = "获取当前登录用户信息")
    @GetMapping("/userInfo")
    public Users getUserInfo(Principal principal) {
        if (principal == null) {
            return null;
        }
        String phone = principal.getName();
        Users user = usersService.getUserByPhone(phone);
        user.setPasswordHash(null);
        return user;
    }

    @ApiOperation(value = "生成验证码")
    @GetMapping("/captcha/generate")
    public RespBean generateCaptcha() {
        return captchaUtil.generateCaptcha();
    }

    @ApiOperation(value = "验证验证码")
    @PostMapping("/captcha/verify")
    private RespBean verifyCaptcha(@RequestBody CaptchaDTO captchaDTO) {
        return captchaUtil.validateCaptcha(captchaDTO.getKey(), captchaDTO.getCode()) ?
                RespBean.success(RespCode.SUCCESS, "验证成功") :
                RespBean.error(RespCode.CAPTCHA_VALIDATE_FAILED, "验证失败");
    }

    @ApiOperation(value = "注册接口")
    @PostMapping("/register")
    public RespBean register(@RequestBody RegisterDTO registerDTO) {
        return usersService.register(registerDTO);
    }

    @ApiOperation(value = "获取用户的安全问题")
    @PostMapping("/forgot-password/question")
    public RespBean getSecurityQuestion(@RequestBody SecurityQuestionDTO securityQuestionDTO) {
        return usersService.getSecurityQuestion(securityQuestionDTO);
    }

    @ApiOperation(value = "验证安全问题")
    @PostMapping("/forgot-password/verify")
    public RespBean verifySecurityQuestion(@RequestBody SecurityQuestionDTO securityQuestionDTO) {
        return usersService.verifySecurityAnswer(securityQuestionDTO);
    }

    @ApiOperation(value = "重置密码")
    @PostMapping("/forgot-password/reset")
    public RespBean resetPassword(@RequestBody SecurityQuestionDTO securityQuestionDTO) {
        return usersService.resetPassword(securityQuestionDTO);
    }
}
