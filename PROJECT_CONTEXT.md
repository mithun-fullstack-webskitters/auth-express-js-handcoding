# Project Context: Express.js Authentication API

> Reusable handoff for an AI coding assistant. This document was refreshed on 2026-07-23 from branch `feat/production-securiy-hardening` at commit `b0ac53202e96e67cd3d75fe178c22d19068ef59e`.
>
> Historical note: this context file was originally added in commit `f31a81dc91c586023c3e05c7ae35f1c7b95295c4` (`feat: added the project context markdown file`). Future agents should use the current commit above as the reference point for this document, then inspect live files and `git status --short` before changing anything.

## 1. Project overview

This repository is a hand-coded Express.js authentication API. It is a backend-only learning/project codebase, not a production-complete auth service yet.

Current implemented areas:

- User signup and login with bcrypt-hashed passwords.
- Access JWTs returned in JSON responses.
- Refresh JWTs stored in `httpOnly` cookies and persisted server-side as SHA-256 hashes in a `Session` collection.
- Session metadata capture using user-agent parsing: device type, browser name, and IP address.
- Refresh-token endpoint that checks the cookie, verifies JWT type, finds a matching active session, and issues new access/refresh tokens.
- Logout current session, logout all sessions, list sessions, and revoke one session.
- Bearer access-token protection for profile/session endpoints.
- Token-based forgot/reset password flow that currently returns a reset URL in the API response.
- Basic security middleware: `helmet`, configured CORS, cookie parsing, and rate limiting on public auth endpoints.

Core stack:

- Node.js with ECMAScript modules (`"type": "module"`)
- Express 5
- MongoDB and Mongoose
- `bcryptjs`
- `jsonwebtoken`
- `express-validator`
- `express-rate-limit`
- `cookie-parser`
- `cors`
- `helmet`
- `ua-parser-js`
- `dotenv`
- Nodemon scripts

There is no frontend, test suite, API documentation generator, container setup, CI configuration, or deployment configuration in this repository.

## 2. Repository structure

```text
auth-express-js-handcoding/
├── config/
│   └── db.js
├── controller/
│   └── auth.controller.js
├── middleware/
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   ├── rateLimit.middleware.js
│   └── validate.middleware.js
├── model/
│   ├── auth.model.js
│   └── session.model.js
├── route/
│   └── auth.route.js
├── utils/
│   ├── AppError.js
│   ├── asyncHandler.js
│   ├── cookieOptions.js
│   ├── createSession.js
│   ├── findDevice.js
│   ├── generateAccessToken.js
│   ├── generateRefreshToken.js
│   ├── generateToken.js
│   ├── hashToken.js
│   ├── sendResponse.js
│   └── utils.js
├── .env                 # Local config/secrets; ignored. Never print or commit values.
├── .gitignore
├── main.js
├── package.json
├── PROJECT_CONTEXT.md
└── yarn.lock
```

Exclude `.git/`, `node_modules/`, and generated dependency contents when reasoning about the application. `.env` is local-only and must not be reproduced.

## 3. File responsibilities

| File | Responsibility |
| --- | --- |
| `main.js` | Loads Express app, calls `connectDB()`, configures CORS from `CLIENT_URL`, registers `helmet`, parsers, cookie parser, root route, auth routes at `/api/auth/`, global error handler, and starts `PORT || 5000`. |
| `config/db.js` | Loads dotenv and connects Mongoose to `MONGODB_URI`. Logs connected host. Exits process on connection failure. |
| `route/auth.route.js` | Declares auth endpoints and attaches validation, auth protection, and `authLimiter` where currently configured. |
| `controller/auth.controller.js` | Implements signup, login, forgot/reset password, profile, refresh token, logout, logout all, sessions listing, and session revocation. |
| `model/auth.model.js` | Defines the `User` schema/model. |
| `model/session.model.js` | Defines the `Session` schema/model for hashed refresh tokens and device/browser/IP metadata. |
| `middleware/auth.middleware.js` | Verifies Bearer access tokens, checks token type, loads the user, and assigns `req.user`. |
| `middleware/validate.middleware.js` | Defines signup/login validation and returns validation errors with HTTP 400. |
| `middleware/rateLimit.middleware.js` | Exports `authLimiter`: 10 requests per 15 minutes with standard rate-limit headers. |
| `middleware/error.middleware.js` | Converts forwarded errors into `{ success: false, message }` using `err.statusCode || 500`. |
| `utils/AppError.js` | Custom error with `statusCode` and derived `status`. |
| `utils/asyncHandler.js` | Wraps async controllers and forwards rejected promises to Express error middleware. |
| `utils/generateAccessToken.js` | Signs access JWTs with `{ userId, type: "access" }`. |
| `utils/generateRefreshToken.js` | Signs refresh JWTs with `{ id: userId, type: "refresh" }`. |
| `utils/hashToken.js` | SHA-256 hashes raw tokens before persistence/lookup. |
| `utils/createSession.js` | Creates a session document with hashed refresh token, metadata, and expiry. |
| `utils/cookieOptions.js` | Defines refresh cookie options. See known issues: the import currently omits `.js`. |
| `utils/findDevice.js` | Uses `ua-parser-js` to parse `req.headers["user-agent"]`. |
| `utils/sendResponse.js` | Shared success response helper. |
| `utils/utils.js` | Exports `REFRESH_COOKIE_MAX_AGE`. See known issues: current math is likely wrong. |

## 4. Startup and middleware flow

Startup flow:

1. `main.js` imports `connectDB` and calls `connectDB()`.
2. `config/db.js` also calls `dotenv.config()` during module evaluation.
3. `main.js` calls `dotenv.config()` after `connectDB()`.
4. Express app registers:
   - `cors({ origin: process.env.CLIENT_URL, credential: true, methods, allowedHeaders })`
   - `helmet()`
   - `express.json()`
   - `express.urlencoded({ extended: true })`
   - `cookieParser()`
5. Root route `GET /` returns a simple success message.
6. Auth router is mounted at `/api/auth/`.
7. Global error handler is registered after routes.
8. App listens on `process.env.PORT || 5000`.

Important behavior:

- The database connection is started but not awaited before `app.listen`.
- CORS option is currently `credential: true`; the standard `cors` option is `credentials: true`.
- ESM imports should include explicit `.js` extensions. `utils/cookieOptions.js` currently imports `./utils` without `.js`, which can break Node ESM resolution.

## 5. API reference

Base URL during local development: `http://localhost:<PORT>`, default `http://localhost:5000`.

### `GET /`

- Auth: none
- Success: HTTP 200

```json
{
  "success": true,
  "message": "Server running successfully!"
}
```

### `POST /api/auth/signup`

- Middleware: `authLimiter`, `signupValidation`, `validate`
- Body:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "secret123"
}
```

- Behavior:
  1. Checks duplicate email.
  2. Hashes password with bcrypt.
  3. Creates user.
  4. Generates access JWT and refresh JWT.
  5. Parses user-agent metadata.
  6. Creates a session with hashed refresh token.
  7. Sets `refreshToken` cookie.
  8. Returns access token and user data.
- Success: HTTP 201, message `User registered successfully!`

Response shape:

```json
{
  "success": true,
  "message": "User registered successfully!",
  "data": {
    "accessToken": "<access-jwt>",
    "user": {
      "id": "<user-id>",
      "name": "Example User",
      "email": "user@example.com"
    }
  }
}
```

### `POST /api/auth/login`

- Middleware: `authLimiter`, `loginValidation`, `validate`
- Body:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

- Behavior: finds user with password, compares bcrypt hash, creates access/refresh tokens, creates session, sets refresh cookie.
- Success: HTTP 200, message `Login Successfully!`
- Important bug: `bcrypt.compare(password, user.password)` is not awaited, so invalid passwords may not be rejected correctly.

### `GET /api/auth/get-profile`

- Middleware: `protect`
- Header:

```http
Authorization: Bearer <access-token>
```

- Behavior: verifies access JWT and returns `req.user`.
- Success: HTTP 200

```json
{
  "success": true,
  "data": {
    "_id": "<user-id>",
    "name": "Example User",
    "email": "user@example.com"
  }
}
```

Important detail: `generateAccessToken` signs payload key `userId`, and `protect` reads `decoded.userId`. Older code used `id`; do not reintroduce that mismatch.

### `POST /api/auth/forget-password`

- Middleware: `authLimiter`
- Body:

```json
{
  "email": "user@example.com"
}
```

- Behavior: creates raw reset token, stores SHA-256 hash on the user, sets expiry to 15 minutes, and returns a reset URL.
- Success: HTTP 200, message `Reset token generated`
- Current reset URL is hard-coded to `http://localhost:5000/api/auth/reset-password/<token>`.

### `POST /api/auth/reset-password/:token`

- Auth: possession of valid unexpired reset token
- Body:

```json
{
  "password": "newSecret123"
}
```

- Intended behavior: hash URL token, find matching unexpired user, hash and save new password, clear reset fields.
- Important bug: inside the controller, `const hashToken = hashToken(token);` shadows the imported helper and will throw due to temporal dead zone. This endpoint likely fails until renamed.

### `POST /api/auth/refresh-token`

- Middleware: `authLimiter`
- Auth: `refreshToken` cookie
- Behavior:
  1. Reads `refreshToken` from `req.cookies`.
  2. Verifies it with `JWT_SECRET`.
  3. Requires `decode.type === "refresh"`.
  4. Hashes raw refresh token and finds non-revoked matching session.
  5. Populates `session.user`.
  6. Generates new access and refresh tokens.
  7. Creates a new session for the new refresh token.
  8. Sets new `refreshToken` cookie.
  9. Returns new access token.
- Success: HTTP 200, message `Token Refreshed`

Known implementation gap: old refresh sessions are not deleted/revoked during refresh, so rotation creates additional valid sessions instead of replacing the old one.

### `POST /api/auth/logout`

- Auth: refresh cookie if present
- Behavior: if a refresh cookie exists, hashes it and deletes the matching session. Clears refresh cookie.
- Success: HTTP 200, message `Logged out successfully!`

### `POST /api/auth/logout-all`

- Middleware: `protect`
- Behavior: deletes all sessions for `req.user._id`, clears refresh cookie.
- Success: HTTP 200, message `Logout from all devices`

### `GET /api/auth/sessions`

- Middleware: `protect`
- Behavior: returns sessions for current user excluding `hashedRefreshToken`.
- Success: HTTP 200, message `Sessions fetched`

### `DELETE /api/auth/sessions/:sessionId`

- Middleware: `protect`
- Behavior: finds a session by ID and current user, deletes it, and returns success.
- Success: HTTP 200, message `Session revoked`

## 6. Data models

### User

```js
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false, minlength: 6 },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpire: { type: Date, default: null },
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- Password is excluded by default and selected manually in login.
- `unique: true` depends on MongoDB index behavior; it is not a full application-level validator.
- Reset fields are not hidden from normal serialization.

### Session

```js
{
  user: { type: ObjectId, ref: "User", required: true },
  hashedRefreshToken: { type: String, required: true },
  device: { type: String, default: "Unknown Device" },
  browser: { type: String, default: "Unknown Browser" },
  ipAddress: { type: String, default: "" },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
```

Notes:

- Refresh tokens are stored hashed, not raw.
- There is no TTL index in the schema, so expired sessions are not automatically removed by MongoDB.
- `isRevoked` exists, but current logout paths delete sessions instead of marking them revoked.

## 7. Tokens, cookies, responses

Access JWT:

```js
{ userId, type: "access" }
```

Refresh JWT:

```js
{ id: userId, type: "refresh" }
```

Both are signed with `JWT_SECRET`. Access expiry uses `JWT_ACCESS_EXPIRE`; refresh expiry uses `JWT_REFRESH_EXPIRE`.

Refresh cookie:

```js
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: REFRESH_COOKIE_MAX_AGE
}
```

Shared success response:

```json
{
  "success": true,
  "message": "<message>",
  "data": null
}
```

Global error response:

```json
{
  "success": false,
  "message": "<message>"
}
```

Validation error response:

```json
{
  "success": false,
  "errors": []
}
```

## 8. Environment configuration

Expected local `.env` keys:

```dotenv
PORT=5000
MONGODB_URI=<mongodb-connection-string>
JWT_SECRET=<long-random-secret>
JWT_ACCESS_EXPIRE=<jsonwebtoken-duration-such-as-15m>
JWT_REFRESH_EXPIRE=<jsonwebtoken-duration-such-as-7d>
CLIENT_URL=<frontend-origin-for-cors>
NODE_ENV=development
```

Never print, paste, or commit real `.env` values. `PORT` has a code fallback; the other keys are required for related behavior.

## 9. Installation and commands

The repo currently has `package.json` and `yarn.lock`.

```bash
yarn install
yarn dev
```

Scripts:

```json
{
  "test": "npm test",
  "dev": "nodemon main.js",
  "start": "nodemon --use_strict main.js"
}
```

Notes:

- `yarn dev` starts Nodemon.
- `yarn start` also uses Nodemon, which is not ideal for production.
- `test` recursively calls `npm test`; do not expect it to run tests.
- No automated tests are currently present.

## 10. Git state at refresh time

- Current branch: `feat/production-securiy-hardening`
- Current commit: `b0ac53202e96e67cd3d75fe178c22d19068ef59e`
- Short commit: `b0ac532`
- Commit message: `feat: Public auth api limit implement`
- Working tree before editing this document: clean
- Context file originally added in: `f31a81dc91c586023c3e05c7ae35f1c7b95295c4`

Recent history before this refresh:

```text
b0ac532 feat: Public auth api limit implement
f7ed829 fix: not showing the raw jwt error to the users
4c8ae05 fix: clear cookie is a method of the response not request
e3136d8 fix: get all sessions api
a190dcb fix: correct typos in error messages and variable names
033714a feat: implement rollback refresh token and session based authentication
7c9882c fix: correct the name of the schema of the hash refresh token
5635e3b fix: remove console statement
83eada6 feat: refresh token api implement
1c2be1e fix: generate token  functions update
9b1b9de feat: started the production setup coding for authentication
f31a81d feat: added the project context markdown file
```

## 11. Known gaps and risks

1. **`cookieOptions.js` import likely breaks ESM.** It imports `./utils` instead of `./utils.js`.
2. **CORS credentials option is misspelled.** `credential: true` should be `credentials: true`.
3. **Login password comparison is not awaited.** `bcrypt.compare(...)` returns a promise, so invalid passwords may pass.
4. **Reset password controller shadows `hashToken`.** `const hashToken = hashToken(token);` likely throws before token lookup.
5. **Session creation is not awaited in signup/login/refresh.** Responses may be sent before the session write completes, and write errors can be lost.
6. **Refresh rotation does not revoke/delete the previous session.** Refreshing creates another valid session.
7. **Refresh cookie max-age math looks wrong.** `7*24*60*60*60*1000` equals 60 days, not 7 days. A normal 7-day millisecond value is `7*24*60*60*1000`.
8. **No TTL index exists for sessions.** Expired sessions remain until manually removed.
9. **`expiresAt` is not checked in refresh query.** Refresh lookup checks token validity through JWT expiry and session presence, but not `session.expiresAt`.
10. **Logout current session is unprotected.** It relies on refresh cookie only, which is acceptable by contract but should be intentional.
11. **Forgot/reset password validation is missing.** Email and new password should be validated.
12. **Forgot password leaks user existence.** It returns `User not found!`.
13. **Reset delivery is development-only.** The reset URL is returned in JSON and hard-coded to localhost.
14. **Profile may expose reset fields.** `protect` only excludes password, not reset token/expiry fields.
15. **Controllers are inconsistently wrapped.** Some handlers use `asyncHandler`; `getProfile` and `refreshToken` are plain async functions.
16. **Error handling is inconsistent.** `protect` returns responses directly instead of forwarding `AppError`.
17. **Server starts without awaiting DB connection.**
18. **Production script uses Nodemon.**
19. **No automated tests.** Auth, session, refresh, logout, validation, and error paths need coverage.
20. **Dependency hygiene needs review.** `crypto` npm package is unnecessary because Node has built-in `crypto`; `nodemailer` is installed but email sending is not implemented; `nodemon` is in dependencies.

## 12. Guidance for future agents

Before editing:

1. Run `git status --short` and preserve unrelated user changes.
2. Read `package.json`, `main.js`, `route/auth.route.js`, `controller/auth.controller.js`, both models, middleware, and auth utilities.
3. Treat live code as authoritative over this document.
4. Never reveal `.env` values.
5. Keep ESM imports explicit with `.js`.
6. Preserve the current layered organization unless the user asks for a refactor.
7. Be precise about implemented behavior versus intended production behavior.
8. When changing auth flows, add or update tests if practical.
9. Avoid silently changing public API response contracts.
10. For production hardening, prioritize the known runtime bugs first, then refresh-token rotation/revocation semantics, session cleanup, password-reset delivery, validation, CORS/cookie correctness, scripts, and tests.

Immediate next useful fixes are likely:

- Fix `cookieOptions.js` import extension.
- Fix CORS `credentials`.
- Await bcrypt compare and session creation.
- Fix reset-password `hashToken` shadowing.
- Correct refresh cookie max-age.
- Revoke or delete old session during refresh-token rotation.
- Add tests around signup/login/refresh/logout/session routes.
