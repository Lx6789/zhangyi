package org.lx.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.lx.mapper.UsersMapper;
import org.lx.pojo.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * @Title: UserUtil
 * @Author: MrLu2
 * @Package: org.lx.config
 * @Date: 2026/3/6 14:29
 * @Description: 工具类
 */

@Component
public class UserUtil {

    @Autowired
    private UsersMapper usersMapper;

    /**
     * 从SecurityContext获取用户信息
     * @return
     */
    public Users getUserFromSecurityContext () {
        try {
            UserDetails userDetails = (UserDetails) SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getPrincipal();
            String phone = userDetails.getUsername();
            if (phone == null) {
                return null;
            }
            LambdaQueryWrapper<Users> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Users::getPhone, phone);
            Users user = usersMapper.selectOne(queryWrapper);
            return user;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
