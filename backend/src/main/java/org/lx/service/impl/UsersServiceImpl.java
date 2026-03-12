package org.lx.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.config.CaptchaUtil;
import org.lx.config.UserIdentifierDetectorUtil;
import org.lx.config.security.JwtTokenUtil;
import org.lx.pojo.Users;
import org.lx.mapper.UsersMapper;
import org.lx.pojo.dto.LoginDTO;
import org.lx.pojo.dto.RegisterDTO;
import org.lx.pojo.dto.SecurityQuestionDTO;
import org.lx.pojo.vo.LoginVO;
import org.lx.service.IUsersService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * <p>
 * 用户表 - 存储系统用户基本信息 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Slf4j
@Service
public class UsersServiceImpl extends ServiceImpl<UsersMapper, Users> implements IUsersService {

    @Value("${jwt.tokenHead}")
    private String tokenHead;
    @Autowired
    private UserDetailsService userDetailsService;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    @Autowired
    private UsersMapper usersMapper;
    @Autowired
    private CaptchaUtil captchaUtil;

    /**
     * 登录之后返回token
     * @param loginDTO
     * @param request
     * @return
     */
    @Override
    public RespBean login(LoginDTO loginDTO, HttpServletRequest request) {
        // 登录验证
        UserDetails userDetails = userDetailsService.loadUserByUsername(loginDTO.getIdentifier());
        if (userDetails == null || !passwordEncoder.matches(loginDTO.getPassword(), userDetails.getPassword())) {
            return RespBean.error(RespCode.LOGIN_FAILED, "用户名或密码错误");
        }
        if (!userDetails.isEnabled()) {
            return RespBean.error(RespCode.USER_DISABLED, "账号已被禁用，请联系管理员");
        }

        // 更新security登陆用户对象
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);

        //用 identifier 查询用户，而不是 username
        LambdaQueryWrapper<Users> queryWrapper = new LambdaQueryWrapper<>();
        if (UserIdentifierDetectorUtil.isPhoneNumber(loginDTO.getIdentifier())) {
            queryWrapper.eq(Users::getPhone, loginDTO.getIdentifier());
        } else if (UserIdentifierDetectorUtil.isEmail(loginDTO.getIdentifier())) {
            queryWrapper.eq(Users::getEmail, loginDTO.getIdentifier());
        }
        Users users = usersMapper.selectOne(queryWrapper);

        // 创建token - token 中会存储手机号（因为 getUsername() 返回 tokenUsername）
        String token = jwtTokenUtil.generateToken(userDetails, loginDTO.isRememberMe());

        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("tokenHead", tokenHead);

        Map<String, Object> user = new HashMap<>();
        user.put("id", users.getId());
        user.put("username", users.getDisplayUsername()); // 使用昵称
        user.put("phone", users.getPhone());

        if (users.getEmail() != null) {
            user.put("email", users.getEmail());
        }
        if (users.getAvatar() != null) {
            user.put("avatar", users.getAvatar());
        }

        // 将user对象放入data中
        data.put("user", user);

        return RespBean.success(RespCode.SUCCESS ,"登录成功", data);
    }

    /**
     * 根据电话获取用户
     * @param phone
     * @return
     */
    @Override
    public Users getUserByPhone(String phone) {
        Users user = usersMapper.selectOne(new QueryWrapper<Users>().eq("phone", phone).eq("status", 0));
        if (user == null) {
            log.info("{} 用户查询失败", phone);
            return null;
        }
        return user;
    }

    /**
     * 注册用户
     * @param registerDTO
     * @return
     */
    @Override
    public RespBean register(RegisterDTO registerDTO) {
        //判断是否为空
        if (registerDTO == null) {
            return RespBean.error(RespCode.BAD_REQUEST, "参数错误");
        }
        // 判断验证码是否正确
        if (!captchaUtil.validateCaptcha(registerDTO.getCaptchaKey(), registerDTO.getCaptchaCode())) {
            return RespBean.error(RespCode.CAPTCHA_VALIDATE_FAILED, "验证码错误");
        }
        // 检查验证码是否已经使用过（防止重复提交）
        if (!captchaUtil.isCaptchaVerified(registerDTO.getCaptchaKey())) {
            return RespBean.error(RespCode.CAPTCHA_VALIDATE_FAILED, "验证码无效或已使用");
        }
        //判断电话号码是否已被注册
        LambdaQueryWrapper<Users> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Users::getPhone, registerDTO.getPhone());
        long count = count(queryWrapper);
        if (count > 0) {
            return RespBean.error(RespCode.USER_ALREADY_EXISTS, "用户已存在");
        }
        //注册
        Users user = new Users();
        user
                .setPhone(registerDTO.getPhone())
                .setPasswordHash(passwordEncoder.encode(registerDTO.getPassword()))
                .setUsername(registerDTO.getPhone())
                .setStatus(0)
                .setCreatedAt(LocalDateTime.now())
                .setUpdatedAt(LocalDateTime.now());

        setSecurityInfo(user, registerDTO.getSecurityQuestion(), registerDTO.getSecurityAnswer());

        usersMapper.insert(user);
        // 注册成功后清理已验证标记
        captchaUtil.cleanVerifiedCaptcha(registerDTO.getCaptchaKey());
        return RespBean.success(RespCode.SUCCESS, "注册成功");
    }

    /**
     * 获取安全问题
     * @param securityQuestionDTO
     * @return
     */
    @Override
    public RespBean getSecurityQuestion(SecurityQuestionDTO securityQuestionDTO) {
        if (securityQuestionDTO == null) {
            return RespBean.error(RespCode.BAD_REQUEST, "数据错误");
        }
        //1.对比验证码是否正确
        // 判断验证码是否正确
        if (!captchaUtil.validateCaptcha(securityQuestionDTO.getCaptchaKey(), securityQuestionDTO.getCaptchaCode())) {
            return RespBean.error(RespCode.CAPTCHA_VALIDATE_FAILED, "验证码错误");
        }
        // 检查验证码是否已经使用过（防止重复提交）
        if (!captchaUtil.isCaptchaVerified(securityQuestionDTO.getCaptchaKey())) {
            return RespBean.error(RespCode.CAPTCHA_VALIDATE_FAILED, "验证码无效或已使用");
        }
        //2.查询数据库中是否存在用户
        LambdaQueryWrapper<Users> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Users::getPhone, securityQuestionDTO.getPhone());
        long count = count(queryWrapper);
        if (count <= 0) {
            return RespBean.error(RespCode.USER_NOT_EXIST, "该号码未被注册");
        }
        //3.查询安全问题并返回给前端
        String securityQuestion = usersMapper.selectOne(queryWrapper).getSecurityQuestion();
        if (securityQuestion == null) {
            return RespBean.error(RespCode.SECURITY_QUESTION_NOT_SET, "未设置安全问题");
        }
        LoginVO loginVO = new LoginVO();
        loginVO.setSecurityQuestion(securityQuestion);
        return RespBean.success(RespCode.SUCCESS, "验证码正确", loginVO);
    }

    /**
     * 验证安全问题
     * @param securityQuestionDTO
     * @return
     */
    @Override
    public RespBean verifySecurityAnswer(SecurityQuestionDTO securityQuestionDTO) {
        if (securityQuestionDTO == null) {
            return RespBean.error(RespCode.BAD_REQUEST, "数据错误");
        }
        //获取盐值与答案hash
        Map<String, Object> saltWithSecurityAnswerHash = usersMapper.getSaltWithSecurityAnswerHash(securityQuestionDTO.getPhone());
        if (saltWithSecurityAnswerHash == null) {
            return RespBean.error(RespCode.USER_NOT_EXIST, "该号码未被注册");
        }
        String securityAnswerHash = (String) saltWithSecurityAnswerHash.get("security_answer_hash");
        String securityAnswerSalt = (String) saltWithSecurityAnswerHash.get("security_answer_salt");
        if (securityAnswerHash == null || securityAnswerSalt == null) {
            return RespBean.error(RespCode.SECURITY_QUESTION_NOT_SET, "未设置安全问题");
        }
        //判断答案是否正确
        String saltedAnswer = securityQuestionDTO.getSecurityAnswer() + securityAnswerSalt;
        boolean isAnswerCorrect = passwordEncoder.matches(saltedAnswer, securityAnswerHash);

        if (!isAnswerCorrect) {
            return RespBean.error(RespCode.SECURITY_ANSWER_WRONG, "安全答案错误");
        }

        return RespBean.success(RespCode.SUCCESS, "安全问题答案正确");
    }

    /**
     * 重置密码
     * @param securityQuestionDTO
     * @return
     */
    @Override
    public RespBean resetPassword(SecurityQuestionDTO securityQuestionDTO) {
        if (securityQuestionDTO == null) {
            return RespBean.error(RespCode.BAD_REQUEST, "数据错误");
        }
        // 创建更新条件
        LambdaUpdateWrapper<Users> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper
                .eq(Users::getPhone, securityQuestionDTO.getPhone())
                .set(Users::getPasswordHash, passwordEncoder.encode(securityQuestionDTO.getNewPassword()))
                .set(Users::getUpdatedAt, LocalDateTime.now());

        // 执行更新
        int rows = usersMapper.update(null, updateWrapper);

        if (rows > 0) {
            return RespBean.success(RespCode.SUCCESS, "密码重置成功");
        } else {
            return RespBean.error(RespCode.PASSWORD_EXPIRED, "密码重置失败");
        }
    }

    /**
     * 设置用户安全问题和答案
     * @param user 用户对象
     * @param question 安全问题
     * @param answer 安全答案
     */
    private void setSecurityInfo(Users user, String question, String answer) {
        user.setSecurityQuestion(question);

        // 生成盐值
        String salt = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        user.setSecurityAnswerSalt(salt);

        // 答案 + 盐值，然后加密
        String saltedAnswer = answer + salt;
        String hashedAnswer = passwordEncoder.encode(saltedAnswer);
        user.setSecurityAnswerHash(hashedAnswer);

        user.setSecuritySetTime(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
    }
}
