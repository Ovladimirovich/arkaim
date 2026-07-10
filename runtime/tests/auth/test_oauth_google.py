import time
import pytest
from unittest.mock import patch
from jose import jwt

class TestGoogleOAuth:
    def test_get_auth_url(self):
        from auth.oauth.google import get_google_auth_url
        with patch("auth.oauth.google.settings.GOOGLE_CLIENT_ID", "cid"):
            u = get_google_auth_url("https://ex.com/cb")
            assert "cid" in u and "accounts.google.com" in u
    def test_get_auth_url_missing_id(self):
        from auth.oauth.google import get_google_auth_url, GoogleOAuthError
        with patch("auth.oauth.google.settings.GOOGLE_CLIENT_ID", ""):
            with pytest.raises(GoogleOAuthError, match="не задан"):
                get_google_auth_url("https://ex.com/cb")
    def test_parse_google_user(self):
        from auth.oauth.google import parse_google_user
        r = parse_google_user({"sub":"g1","email":"u@gmail.com","name":"U"})
        assert r["provider"]=="google" and r["provider_user_id"]=="g1"
    def test_verify_wrong_audience(self):
        from auth.oauth.google import verify_google_id_token, GoogleOAuthError
        t = jwt.encode({"sub":"1","aud":"wrong","iss":"https://accounts.google.com","exp":int(time.time())+3600},"s")
        with patch("auth.oauth.google.settings.GOOGLE_CLIENT_ID", "my"):
            with pytest.raises(GoogleOAuthError, match="aud"):
                verify_google_id_token(t)
    def test_verify_wrong_issuer(self):
        from auth.oauth.google import verify_google_id_token, GoogleOAuthError
        with patch("auth.oauth.google.jwt.decode") as mock_decode:
            mock_decode.return_value = {"sub":"1","aud":"my","iss":"https://evil.com"}
            with patch("auth.oauth.google.settings.GOOGLE_CLIENT_ID", "my"):
                with pytest.raises(GoogleOAuthError, match="iss"):
                    verify_google_id_token("fake.token")
