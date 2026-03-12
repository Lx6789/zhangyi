package org.lx.config.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class JwtTokenUtil {

    private static final String CLAIM_KEY_USERNAME = "sub";
    private static final String CLAIM_KEY_CREATED = "created";

    @Value("${jwt.secret}")
    private String secret;
    @Value("${jwt.expiration}")
    private Long expiration;
    @Value("${jwt.rememberMeExpiration}")
    private Long rememberMeExpiration;

    private final Map<String, Claims> claimsCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("JWT secret 初始化完成: {}", secret);
    }

    /**
     * 从token中获取登录用户名
     */
    public String getUsernameFromToken(String token) {
        try {
            // 添加token前缀日志，查看token是否完整
            log.info("接收到的token前缀: {}", token.substring(0, Math.min(20, token.length())) + "...");

            Claims claims = getClaimFromToken(token);
            if (claims == null) {
                return null;
            }
            String username = claims.getSubject();
            log.info("从token解析出用户名: {}", username);
            log.info("token过期时间: {}", claims.getExpiration());
            return username;
        } catch (Exception e) {
            log.error("从token解析用户名失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 判断token是否有效
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        try {
            Claims claims = getClaimFromToken(token);
            if (claims == null) {
                log.error("token验证失败：无法获取claims");
                return false;
            }

            String username = claims.getSubject();
            boolean isValid = username.equals(userDetails.getUsername()) && !isTokenExpired(claims);
            log.info("token验证结果: {}", isValid);
            return isValid;
        } catch (Exception e) {
            log.error("token验证过程出错: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 判断token是否可以被刷新
     */
    public boolean canRefresh(String token) {
        Claims claims = getClaimFromToken(token);
        return claims != null && !isTokenExpired(claims);
    }

    /**
     * 刷新token
     */
    public String refreshToken(String token, boolean rememberMe) {
        Claims claims = getClaimFromToken(token);
        if (claims == null) {
            log.error("刷新token失败：无法获取claims");
            return null;
        }
        claims.put(CLAIM_KEY_CREATED, new Date());
        return generateToken(claims, rememberMe);
    }

    /**
     * 判断token是否失效（使用已解析的Claims）
     */
    private boolean isTokenExpired(Claims claims) {
        Date expireDate = claims.getExpiration();
        boolean isExpired = expireDate.before(new Date());
        log.info("token过期状态: {}", isExpired ? "已过期" : "未过期");
        return isExpired;
    }

    /**
     * 从token中获取荷载（带缓存）
     */
    private Claims getClaimFromToken(String token) {
        // 先从缓存中获取
        Claims cachedClaims = claimsCache.get(token);
        if (cachedClaims != null) {
            log.debug("从缓存获取token解析结果");
            return cachedClaims;
        }

        try {
            log.debug("开始解析token，使用secret: {}", secret);

            // 打印完整的token（注意：生产环境不要这样做，这里仅用于调试）
            log.debug("完整token: {}", token);

            Claims claims = Jwts.parser()
                    .setSigningKey(secret)
                    .parseClaimsJws(token)
                    .getBody();

            // 存入缓存
            claimsCache.put(token, claims);
            log.debug("token解析成功，已存入缓存");
            return claims;
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.error("token已过期: {}", e.getMessage());
            return null;
        } catch (io.jsonwebtoken.SignatureException e) {
            log.error("token签名验证失败: {}", e.getMessage());
            log.error("使用的secret: {}", secret);
            return null;
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error("token格式错误: {}", e.getMessage());
            log.error("错误信息中的token部分: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("解析token失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 清除token缓存（可在登出时调用）
     */
    public void removeTokenFromCache(String token) {
        claimsCache.remove(token);
        log.debug("token已从缓存中移除");
    }

    /**
     * 根据用户信息生成token
     */
    public String generateToken(UserDetails userDetails, boolean rememberMe) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_KEY_USERNAME, userDetails.getUsername());
        claims.put(CLAIM_KEY_CREATED, new Date());
        return generateToken(claims, rememberMe);
    }

    /**
     * 根据荷载生成token
     */
    private String generateToken(Map<String, Object> claims, boolean rememberMe) {
        String token = Jwts.builder()
                .setClaims(claims)
                .setExpiration(generateExpirationDate(rememberMe))
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();

        log.info("生成新token，长度: {}", token.length());

        // 生成token时也存入缓存
        try {
            Claims parsedClaims = Jwts.parser()
                    .setSigningKey(secret)
                    .parseClaimsJws(token)
                    .getBody();
            claimsCache.put(token, parsedClaims);
        } catch (Exception e) {
            log.error("新生成token缓存失败: {}", e.getMessage());
        }

        return token;
    }

    /**
     * 生成token失效时间
     */
    private Date generateExpirationDate(boolean rememberMe) {
        return new Date(System.currentTimeMillis() + (rememberMe ? rememberMeExpiration : expiration) * 1000);
    }
}