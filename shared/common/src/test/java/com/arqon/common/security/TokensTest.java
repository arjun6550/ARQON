package com.arqon.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TokensTest {

    @Test
    void tokensAreUniqueUrlSafeAndFixedLength() {
        String a = Tokens.newToken();
        String b = Tokens.newToken();
        assertThat(a).hasSize(Tokens.TOKEN_LENGTH).isNotEqualTo(b);
        assertThat(Tokens.looksLikeToken(a)).isTrue();
    }

    @Test
    void rejectsMalformedTokens() {
        assertThat(Tokens.looksLikeToken(null)).isFalse();
        assertThat(Tokens.looksLikeToken("short")).isFalse();
        assertThat(Tokens.looksLikeToken("a".repeat(42) + "!")).isFalse();
        assertThat(Tokens.looksLikeToken("a".repeat(44))).isFalse();
    }

    @Test
    void hashIsStableHexAndDiffersFromInput() {
        String t = Tokens.newToken();
        assertThat(Tokens.sha256Hex(t)).isEqualTo(Tokens.sha256Hex(t)).hasSize(64).isNotEqualTo(t);
        assertThat(Tokens.sha256Hex("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
