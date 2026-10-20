package com.backend;

import java.security.Principal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    @GetMapping("/status")
    public AuthStatus status(Principal principal) {
        return principal == null
                ? new AuthStatus(false, null)
                : new AuthStatus(true, principal.getName());
    }

    public record CsrfResponse(String headerName, String parameterName, String token) {}
    public record AuthStatus(boolean authenticated, String username) {}
}
