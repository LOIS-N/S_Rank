package com.ssafy.srank.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.auth.application.service.GoogleOAuthService;
import com.ssafy.srank.auth.application.service.GoogleUserInfo;
import com.ssafy.srank.auth.application.service.WalletProvider;
import com.ssafy.srank.auth.domain.entity.AuthProvider;
import com.ssafy.srank.auth.jwt.JwtTokenProvider;
import com.ssafy.srank.auth.repository.AuthSessionRepository;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserCoinLedgerRepository;
import com.ssafy.srank.user.repository.UserGoldLedgerRepository;
import com.ssafy.srank.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserGoldLedgerRepository userGoldLedgerRepository;

    @Autowired
    private UserCoinLedgerRepository userCoinLedgerRepository;

    @Autowired
    private AuthSessionRepository authSessionRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private GoogleOAuthService googleOAuthService;

    @MockBean
    private WalletProvider walletProvider;

    @BeforeEach
    void setUp() {
        authSessionRepository.deleteAll();
        userGoldLedgerRepository.deleteAll();
        userCoinLedgerRepository.deleteAll();
        userRepository.deleteAll();
        given(walletProvider.createWallet(any())).willReturn(null);
    }

    @Test
    void existingUserLoginReturnsAccessTokenAndCookie() throws Exception {
        User user = userRepository.save(User.create("user@gmail.com", AuthProvider.GOOGLE, "oauth-1", "메롱"));
        given(googleOAuthService.getUserInfo("oauth-token")).willReturn(new GoogleUserInfo("oauth-1", "user@gmail.com"));

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "provider": "google",
                                  "oauthAccessToken": "oauth-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("로그인에 성공했습니다."))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.isNewUser").value(false))
                .andReturn();

        assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("refresh_token=");
        assertThat(authSessionRepository.findAllByUserIdAndRevokedAtIsNull(user.getId())).hasSize(1);
    }

    @Test
    void newUserLoginReturnsSignupTokenWithoutCookie() throws Exception {
        given(googleOAuthService.getUserInfo("oauth-token")).willReturn(new GoogleUserInfo("oauth-new", "new@gmail.com"));

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "provider": "google",
                                  "oauthAccessToken": "oauth-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isNewUser").value(true))
                .andExpect(jsonPath("$.data.signupToken").isNotEmpty())
                .andReturn();

        assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
    }

    @Test
    void signupThenGetMyInfoAndRefreshWorks() throws Exception {
        String signupToken = jwtTokenProvider.createSignupToken(AuthProvider.GOOGLE, "oauth-2", "signup@gmail.com");

        MvcResult signupResult = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "signupToken": "%s",
                                  "nickname": "메롱2"
                                }
                                """.formatted(signupToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("회원가입이 완료되었습니다."))
                .andExpect(jsonPath("$.data.nickname").value("메롱2"))
                .andReturn();

        String accessToken = readJson(signupResult, "/data/accessToken");
        MockCookie refreshCookie = readRefreshCookie(signupResult);

        mockMvc.perform(get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("signup@gmail.com"))
                .andExpect(jsonPath("$.data.gold").value(10000))
                .andExpect(jsonPath("$.data.coin").value(30));

        mockMvc.perform(put("/api/v1/users/me/nickname")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nickname": "새닉네임"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("새닉네임"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("토큰이 재발급되었습니다."))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(result -> assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("refresh_token="));
    }

    @Test
    void signupRejectsNicknameOutsideCurrentPolicy() throws Exception {
        String signupToken = jwtTokenProvider.createSignupToken(AuthProvider.GOOGLE, "oauth-invalid", "invalid@gmail.com");

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "signupToken": "%s",
                                  "nickname": "123456789"
                                }
                                """.formatted(signupToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("C-001"));
    }

    @Test
    void signupRejectsHangulJamoNickname() throws Exception {
        String signupToken = jwtTokenProvider.createSignupToken(AuthProvider.GOOGLE, "oauth-jamo", "jamo@gmail.com");

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "signupToken": "%s",
                                  "nickname": "ㄱㅏ12"
                                }
                                """.formatted(signupToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("C-001"))
                .andExpect(jsonPath("$.message").value("[nickname] 닉네임은 2~8자의 영문 대소문자, 숫자, 완성형 한글만 사용할 수 있습니다."));
    }

    @Test
    void withdrawnUserCannotLoginAgain() throws Exception {
        String signupToken = jwtTokenProvider.createSignupToken(AuthProvider.GOOGLE, "oauth-3", "withdraw@gmail.com");
        MvcResult signupResult = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "signupToken": "%s",
                                  "nickname": "탈퇴유저"
                                }
                                """.formatted(signupToken)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = readJson(signupResult, "/data/accessToken");
        mockMvc.perform(delete("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reason": "test"
                                }
                                """))
                .andExpect(status().isOk());

        given(googleOAuthService.getUserInfo(eq("oauth-token"))).willReturn(new GoogleUserInfo("oauth-3", "withdraw@gmail.com"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "provider": "google",
                                  "oauthAccessToken": "oauth-token"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("A-008"));
    }

    @Test
    void logoutRevokesSession() throws Exception {
        User user = userRepository.save(User.create("logout@gmail.com", AuthProvider.GOOGLE, "oauth-4", "로그아웃"));
        given(googleOAuthService.getUserInfo("oauth-token")).willReturn(new GoogleUserInfo("oauth-4", "logout@gmail.com"));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "provider": "google",
                                  "oauthAccessToken": "oauth-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = readJson(loginResult, "/data/accessToken");
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("로그아웃되었습니다."))
                .andExpect(result -> assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0"));

        assertThat(authSessionRepository.findAllByUserIdAndRevokedAtIsNull(user.getId())).isEmpty();
    }

    private String readJson(MvcResult result, String fieldPath) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        String[] fields = fieldPath.replaceFirst("^/", "").split("/");
        JsonNode current = node;
        for (String field : fields) {
            current = current.get(field);
        }
        return current.asText();
    }

    private MockCookie readRefreshCookie(MvcResult result) {
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String value = setCookie.substring(setCookie.indexOf('=') + 1, setCookie.indexOf(';'));
        return new MockCookie("refresh_token", value);
    }
}
