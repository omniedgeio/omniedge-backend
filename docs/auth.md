# Register

# Login
```
```

# Refresh Token

`Login` process will response with `refresh_token` , `token` and `expires_at`.


You can use `refresh_token` to refresh token in the following ways as you need

1. when curren time is later than `expires_at`, you can refresh then token
2. when current api request return `401 Unauthorized`, you can refresh token
3. Every time you want to join omniedge network, you can refresh token

## Notes
The refresh token's response is as same as the login api's response. It will respond one
new `refresh_token`, it means that one `refresh_token` can only be used once. If you want 
to call refresh token api again, you need to use the new `refresh_token` responded by refresh api.
