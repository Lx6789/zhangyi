package org.lx.config.security;

import org.lx.pojo.Users;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter {

    @Value("${jwt.tokenHeader}")
    private String tokenHeader;
    @Value("${jwt.tokenHead}")
    private String tokenHead;
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest httpServletRequest,
                                    HttpServletResponse httpServletResponse,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = httpServletRequest.getHeader(tokenHeader);

        // 添加请求路径日志
        logger.info("请求路径: " + httpServletRequest.getRequestURI());
        logger.info("请求方法: " + httpServletRequest.getMethod());

        // 存在token
        if (authHeader != null) {
            logger.info("Authorization头存在: " + authHeader);

            if (authHeader.startsWith(tokenHead)) {
                String authToken = authHeader.substring(tokenHead.length());
                logger.info("解析出的token: " + authToken.substring(0, Math.min(20, authToken.length())) + "...");

                String username = jwtTokenUtil.getUsernameFromToken(authToken);
                logger.info("从token解析出的用户名: " + username);

                // token存在但未登录
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    logger.info("用户未登录，尝试从token加载用户: " + username);

                    // 登录
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // 判断token是否有效，重新设置用户对象
                    if (jwtTokenUtil.validateToken(authToken, userDetails)) {
                        logger.info("token验证成功，设置认证信息");

                        // 如果 userDetails 是 Users 类型，确保 tokenUsername 设置正确
                        if (userDetails instanceof Users) {
                            Users user = (Users) userDetails;
                            // 从 token 中获取的 username 应该是手机号
                            user.setTokenUsername(username);
                        }

                        UsernamePasswordAuthenticationToken authenticationToken =
                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(httpServletRequest));
                        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                    } else {
                        logger.warn("token验证失败");
                    }
                } else if (username == null) {
                    logger.error("无法从token中解析出用户名");
                }
            } else {
                logger.warn("Authorization头不以" + tokenHead + "开头");
            }
        } else {
            logger.debug("请求没有Authorization头");
        }

        filterChain.doFilter(httpServletRequest, httpServletResponse);
    }
}