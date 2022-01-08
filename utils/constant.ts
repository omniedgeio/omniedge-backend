export const ErrorCode = {
  common: {},
  auth: {
    E_INVALID_AUTHORIZATION_HEADER: 'E_INVALID_AUTHORIZATION_HEADER',
    E_UNAUTHORIZED_ACCESS: 'E_UNAUTHORIZED_ACCESS',
    E_EMAIL_PASSWORD_NOT_MATCH: 'E_EMAIL_PASSWORD_NOT_MATCH',
    E_SAVE_USER: 'E_SAVE_USER',

    E_REFRESH_TOKEN_INVALID: 'E_REFRESH_TOKEN_INVALID',

    E_GOOGLE_AUTH_FAIL: 'E_GOOGLE_AUTH_FAIL',
    E_USER_NOT_FOUND: 'E_USER_NOT_FOUND',
    E_USER_EXISTED: 'E_USER_EXISTED',
    E_USER_ACTIVATED: 'E_USER_ACTIVATED',
    E_USER_BLOCKED: 'E_USER_BLOCKED',
    E_TOKEN_INVALID: 'E_TOKEN_INVALID',
    E_TOKEN_EXPIRED: 'E_TOKEN_EXPIRED',
    F_EMAIL_SEND: 'F_EMAIL_SEND',


    E_NEW_PASSWORD_SAME: 'E_NEW_PASSWORD_SAME',
  },
}
