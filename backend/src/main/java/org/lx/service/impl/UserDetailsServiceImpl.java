package org.lx.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.lx.config.UserIdentifierDetectorUtil;
import org.lx.mapper.UsersMapper;
import org.lx.pojo.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * @Title: UserDetailsServiceImpl
 * @Author: MrLu2
 * @Package: org.lx.service.impl
 * @Date: 2026/1/10 00:43
 * @Description: UserDetailsService 实现
 */

@Slf4j
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UsersMapper usersMapper;

    @Override
    public UserDetails loadUserByUsername(String s) throws UsernameNotFoundException {
        Users user;
        //判断是手机号还是邮箱号码
        if (UserIdentifierDetectorUtil.isPhoneNumber(s)) {
            user = usersMapper.selectOne(new QueryWrapper<Users>().eq("phone", s));
        } else if(UserIdentifierDetectorUtil.isEmail(s)) {
            user = usersMapper.selectOne(new QueryWrapper<Users>().eq("email", s));
        } else {
            log.info("用户不存在或标识符格式错误");
            return null;
        }

        if (user == null) {
            log.info("用户不存在");
            return null;
        }

        user.setTokenUsername(user.getPhone());
        return user;
    }


}
