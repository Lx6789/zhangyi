package org.lx.mapper;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.lx.pojo.Friends;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
 * <p>
 * 好友关系表 - 存储用户之间的好友关系 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-03-04
 */
public interface FriendsMapper extends BaseMapper<Friends> {

    /**
     * 查询是否已经是好友
     */
    @Select("SELECT COUNT(*) > 0 FROM friends WHERE (user_id = #{userId} AND friend_id = #{friendId}) OR (user_id = #{friendId} AND friend_id = #{userId})")
    boolean selectWhetherFriend(@Param("userId") Integer userId, @Param("friendId") Integer friendId);

    // 可选：按条件删除
    @Delete("DELETE FROM friends WHERE user_id = #{userId} AND friend_id = #{friendId}")
    int deleteByUserIdAndFriendId(@Param("userId") Integer userId, @Param("friendId") Integer friendId);
}
