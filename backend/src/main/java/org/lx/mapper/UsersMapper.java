package org.lx.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.lx.pojo.Users;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.Map;

/**
 * <p>
 * 用户表 - 存储系统用户基本信息 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Mapper
public interface UsersMapper extends BaseMapper<Users> {

    /**
     * 获取盐值与答案hash
     * 返回一个 Map，包含安全答案的hash和salt
     */
    @Select("SELECT security_answer_hash, security_answer_salt FROM users WHERE phone = #{phone}")
    Map<String, Object> getSaltWithSecurityAnswerHash(String phone);
}
