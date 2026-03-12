package org.lx.mapper;

import io.swagger.models.auth.In;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.lx.pojo.FriendRequests;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * 好友申请表 - 存储用户之间的好友申请 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-05
 */
public interface FriendRequestsMapper extends BaseMapper<FriendRequests> {

    @Delete("delete from friends where friend_id = #{friendId} and user_id = #{userId}")
    Integer deleteByFriendId(Integer friendId, Integer userId);

    @Delete("delete from friends where user_id = #{friendId} and friend_id = #{userId}")
    Integer deleteByUserId(Integer userId, Integer friendId);
}
