# Project Context: Express.js Authentication API

> This document is a reusable handoff for an AI coding assistant. It describes the repository as it exists on the `prod` branch at commit `38b13bf`. Always inspect the live files and Git status before making changes because this document can become stale.

## 1. Project overview

This is a hand-coded REST API for learning and developing authentication with Express.js. It currently supports user registration, login, JWT generation, Bearer-token profile access, and a token-based password-reset flow.

The application uses:

- Node.js with ECMAScript modules (`"type": "module"`)
- Express 5 for HTTP routing and middleware
- MongoDB and Mongoose for user persistence
- `bcryptjs` for password hashing
- `jsonwebtoken` for access and refresh JWT creation and access-token verification
- `express-validator` for signup and login validation
- `dotenv` for environment configuration
- `cookie-parser` and `cors` as global middleware
- Nodemon for both existing development and start scripts

There is no frontend, test suite, API documentation generator, container configuration, or deployment configuration in this repository.

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
│   └── validate.middleware.js
├── model/
│   └── auth.model.js
├── route/
│   └── auth.route.js
├── utils/
│   ├── AppError.js
│   ├── asyncHandler.js
│   ├── generateToken.js
│   └── sendResponse.js
├── .env                 # Local secrets/configuration; ignored and never share its values
├── .gitignore
├── main.js
├── package.json
├── PROJECT_CONTEXT.md
└── yarn.lock            # Present locally but ignored by the current .gitignore
```

Excluded from the tree above: `.git/`, `node_modules/`, and generated dependency contents. The `.env` file is shown only to explain configuration; its actual values are intentionally excluded.

## 3. File responsibilities

| File | Responsibility |
| --- | --- |
| `main.js` | Calls the database connector, loads environment variables, creates the Express app, registers global middleware and the root health-style route, mounts auth routes at `/api/auth/`, registers the global error handler, and listens on `PORT` (default `5000`). |
| `config/db.js` | Loads dotenv and connects Mongoose to `MONGODB_URI`. Logs the connected host. On failure, logs the error message and exits with status 1. |
| `route/auth.route.js` | Declares all authentication endpoints and attaches validation or authentication middleware where currently configured. |
| `controller/auth.controller.js` | Implements signup, login, forgot-password, reset-password, and profile behavior. The refresh-token controller is currently a placeholder. |
| `model/auth.model.js` | Defines and exports the Mongoose `User` model. |
| `middleware/validate.middleware.js` | Defines signup/login validation chains and returns validation errors with HTTP 400. |
| `middleware/auth.middleware.js` | Extracts a Bearer token, verifies it using `JWT_SECRET`, loads the corresponding user, assigns it to `req.user`, and protects the profile endpoint. |
| `middleware/error.middleware.js` | Converts forwarded errors into `{ success: false, message }`, using `err.statusCode` or HTTP 500. |
| `utils/AppError.js` | Custom operational error with `statusCode` and a derived `status` (`fail` for 4xx, otherwise `error`). |
| `utils/asyncHandler.js` | Wraps async controllers and forwards rejected promises to Express error middleware. |
| `utils/generateToken.js` | Signs access and refresh JWTs for a user ID using the same `JWT_SECRET` and separate expiry settings. |
| `utils/sendResponse.js` | Sends the common successful response shape. Its `data` argument defaults to `null`. |
| `package.json` | Defines package metadata, ESM mode, scripts, and dependencies. |
| `.gitignore` | Ignores `/node_modules`, `yarn.lock`, and `.env`. |

## 4. Application startup and request flow

Startup flow:

1. `main.js` imports and calls `connectDB()`.
2. `config/db.js` has already called `dotenv.config()` during module evaluation, so `MONGODB_URI` is available to the connector.
3. `main.js` also calls `dotenv.config()`, creates the Express app, and registers CORS, JSON parsing, URL-encoded parsing, and cookie parsing.
4. The auth router is mounted at `/api/auth/`.
5. The global error handler is registered after the routes.
6. The server listens on `process.env.PORT || 5000`.

Typical auth request flow:

```text
HTTP request
  -> Express global middleware
  -> /api/auth router
  -> optional validation middleware
  -> optional Bearer-token protection middleware
  -> controller
  -> Mongoose User model / token utility
  -> success response

Rejected wrapped controller promise
  -> asyncHandler
  -> global errorHandler
  -> error response
```

Only `signup`, `login`, `forgetPassword`, and `resetPassword` are wrapped with `asyncHandler`. The `getProfile` and placeholder `refreshToken` handlers are plain async functions.

## 5. API reference

Base URL during local development: `http://localhost:<PORT>`. With the default port, this is `http://localhost:5000`.

### `GET /`

- Authentication: none
- Purpose: confirms that the HTTP server is responding
- Request body: none
- Success: HTTP 200

```json
{
  "success": true,
  "message": "Server running successfully!"
}
```

### `POST /api/auth/signup`

- Authentication: none
- Validation:
  - `name`: trimmed and required
  - `email`: trimmed and must be a valid email
  - `password`: minimum length 6
- Request body:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "secret123"
}
```

- Behavior:
  1. Checks for an existing user with the supplied email.
  2. Hashes the password using bcrypt with 10 salt rounds.
  3. Creates the user.
  4. Generates access and refresh JWTs.
- Success: HTTP 201 with message `User registered successfully!`
- Common failures:
  - HTTP 400 with an `errors` array for validation failures
  - HTTP 409 with `User already exist` when the email is already found
  - HTTP 500 for an unclassified database or token error

### `POST /api/auth/login`

- Authentication: none
- Validation:
  - `email`: trimmed and must be a valid email
  - `password`: required, with no minimum-length check here
- Request body:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

- Behavior:
  1. Finds the user and explicitly includes the normally hidden password field.
  2. Compares the supplied password with the bcrypt hash.
  3. Generates access and refresh JWTs.
- Success: HTTP 200 with message `Login Successfully!`
- Common failures:
  - HTTP 400 with an `errors` array for validation failures
  - HTTP 401 with an invalid-credentials message when the user is missing or the password is wrong
  - HTTP 500 for an unclassified database or token error

Signup and login use this token response structure:

```json
{
  "success": true,
  "message": "Login Successfully!",
  "data": {
    "accessToken": "<access-jwt>",
    "refreshToken": "<refresh-jwt>",
    "user": {
      "id": "<mongodb-object-id>",
      "name": "Example User",
      "email": "user@example.com"
    }
  }
}
```

### `GET /api/auth/get-profile`

- Authentication: required
- Header format:

```http
Authorization: Bearer <access-token>
```

- Request body: none
- Behavior: verifies the JWT using `JWT_SECRET`, reads `decoded.id`, fetches the user without the password, and places the result in `req.user`.
- Success: HTTP 200

```json
{
  "success": true,
  "data": {
    "_id": "<mongodb-object-id>",
    "name": "Example User",
    "email": "user@example.com",
    "resetPasswordToken": null,
    "resetPasswordExpire": null,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>",
    "__v": 0
  }
}
```

The exact Mongoose serialization can vary. The middleware does not restrict the JWT `type` claim to `access`, so a valid refresh JWT signed with the same secret may also pass this check.

- Common failures:
  - HTTP 401 if the header/token is absent (`Access denied. Toke not found.` includes the current typo)
  - HTTP 401 with the JWT library error message for an invalid or expired token

### `POST /api/auth/forget-password`

> The project uses the route/controller name `forget-password` / `forgetPassword`; this document preserves the current spelling.

- Authentication: none
- Validation middleware: none
- Request body:

```json
{
  "email": "user@example.com"
}
```

- Behavior:
  1. Finds the user by email.
  2. Generates 32 random bytes and encodes them as a hexadecimal reset token.
  3. Stores only the SHA-256 hash of that token.
  4. Sets expiration to 15 minutes from creation.
  5. Returns a reset URL containing the unhashed token.
- Success: HTTP 200 with message `Reset token generated`

```json
{
  "success": true,
  "message": "Reset token generated",
  "data": {
    "resetURL": "http://localhost:5000/api/auth/reset-password/<reset-token>"
  }
}
```

- Common failures:
  - HTTP 400 with `User not found!`
  - HTTP 500 for an unclassified database or cryptographic error

### `POST /api/auth/reset-password/:token`

- Authentication: possession of a valid, unexpired reset token
- Validation middleware: none
- URL parameter: the raw reset token returned by the forgot-password endpoint
- Request body:

```json
{
  "password": "newSecret123"
}
```

- Behavior:
  1. Hashes the URL token with SHA-256.
  2. Finds a user with the matching stored hash and an expiry later than the current time.
  3. Hashes the new password with bcrypt using 10 salt rounds.
  4. Clears both reset fields and saves the user.
- Success: HTTP 200

```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null
}
```

- Common failures:
  - HTTP 400 with `Invalid or expired token`
  - HTTP 500 for malformed/missing input or an unclassified hashing/database error

Because this route lacks password validation, the controller itself does not enforce the schema's intended six-character minimum before hashing. The stored bcrypt hash is longer than six characters, so Mongoose's minimum applies to the hash rather than reliably validating the raw password.

### `POST /api/auth/refresh-token`

- Authentication: none
- Validation: none
- Request contract: not defined
- Current behavior: placeholder only; it does not read, verify, rotate, persist, or revoke a refresh token.
- Current success response: HTTP 200

```json
{
  "message": "Refresh token API"
}
```

This response intentionally does not follow the shared success-response format.

## 6. Data model and security behavior

### User schema

The `User` collection is managed by this conceptual schema:

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

Important details:

- `password` is excluded from normal queries and must be explicitly selected for login.
- `unique: true` creates/declares a unique index expectation; it is not an application validator by itself.
- Email is normalized to lowercase and trimmed by Mongoose.
- Reset-token fields are not hidden from normal queries or profile serialization.

### JWTs

Both tokens are signed with `JWT_SECRET`:

```js
// Access-token payload
{ id: userId, type: "access" }

// Refresh-token payload
{ id: userId, type: "refresh" }
```

Access expiry comes from `JWT_ACCESS_EXPIRE`; refresh expiry comes from `JWT_REFRESH_EXPIRE`. Tokens are returned in JSON, not stored in cookies by the server. No refresh-token storage or revocation mechanism exists.

### Response formats

Shared success format:

```json
{
  "success": true,
  "message": "<success message>",
  "data": {}
}
```

`data` becomes `null` when omitted. The root, profile, refresh placeholder, authentication failures, and validation failures have variations from this format.

Global error format:

```json
{
  "success": false,
  "message": "<error message>"
}
```

Validation failure format:

```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "<invalid value>",
      "msg": "<validation message>",
      "path": "<field>",
      "location": "body"
    }
  ]
}
```

## 7. Environment configuration

Create a local `.env` file with values appropriate to the environment. Never commit or paste real credentials into an AI chat.

```dotenv
PORT=5000
MONGODB_URI=<mongodb-connection-string>
JWT_SECRET=<long-random-secret>
JWT_ACCESS_EXPIRE=<jsonwebtoken-duration-such-as-15m>
JWT_REFRESH_EXPIRE=<jsonwebtoken-duration-such-as-7d>
```

All five names appear in the current local configuration. `PORT` has a code fallback of `5000`; the other values are required for their related functionality.

## 8. Installation and commands

The repository contains a Yarn v1 lockfile, so Yarn is the most reproducible choice for the current dependency graph:

```bash
yarn install
yarn dev
```

Existing scripts:

```json
{
  "test": "npm test",
  "dev": "nodemon main.js",
  "start": "nodemon --use_strict main.js"
}
```

- `yarn dev` starts Nodemon and reloads when files change.
- `yarn start` also uses Nodemon, which is unusual for production.
- Do not run the current test script expecting tests: `npm test` calls itself recursively and no tests are present.
- Although `yarn.lock` exists locally, `.gitignore` currently ignores it, so verify whether dependency-lock policy should change before editing it.

## 9. Dependencies

Declared runtime dependencies are `bcryptjs`, `cookie-parser`, `cors`, `crypto`, `dotenv`, `express`, `express-validator`, `jsonwebtoken`, `mongoose`, `nodemailer`, and `nodemon`.

Current observations:

- Node's built-in `crypto` module is imported by the controller; the separately declared npm `crypto` package is unnecessary and unused.
- `nodemailer` is declared but email sending is not implemented.
- `cookie-parser` is registered, but authentication tokens are not read from or written to cookies.
- `nodemon` is used by scripts but is listed under `dependencies` rather than `devDependencies`.
- CORS is registered with default unrestricted behavior.

## 10. Git state and work completed

At the time this document was created:

- Current branch: `prod`
- Current commit: `38b13bf` (`fix: start working on production authentication code`)
- Working tree before adding this document: clean
- Remote tracking shown locally: `origin/prod` at the same commit
- `prod` is one commit ahead of local `dev` / `origin/dev`

The latest production-focused commit changed six files and introduced a more centralized controller/error pattern:

- Added `AppError` for status-aware errors.
- Added `asyncHandler` to forward async controller failures.
- Added `sendResponse` for successful response formatting.
- Added and registered the global error middleware.
- Refactored authentication controllers to use these helpers for implemented flows.

Earlier history indicates incremental work on login errors, refresh-token flow, profile integration, forgot password, and password reset. The live implementation—not commit-message wording—is the source of truth; refresh-token behavior is currently still a stub.

## 11. Known gaps and risks

1. **Refresh flow is incomplete.** The endpoint is a placeholder, its input contract is undefined, and refresh tokens are not persisted, rotated, revoked, or checked.
2. **Token types are not enforced during profile authentication.** The protection middleware verifies signature/expiry but does not require `decoded.type === "access"`.
3. **Password-reset delivery is development-only.** The forgot-password endpoint returns a hard-coded localhost URL instead of emailing it, despite Nodemailer being installed.
4. **Reset URLs hard-code port 5000.** They do not use `PORT`, an application base URL, or a frontend URL.
5. **Forgot/reset validation is absent.** Email and new password inputs are not validated by `express-validator`.
6. **Raw reset-password length is not reliably enforced.** The controller hashes before saving, so the Mongoose `minlength` check applies to the hash.
7. **Reset details may leak through profile data.** `resetPasswordToken` and `resetPasswordExpire` are selected normally and the entire user document is returned by the profile endpoint.
8. **Missing users are not explicitly rejected after JWT verification.** `findById` may produce `null`, which is assigned to `req.user`, and the request continues.
9. **Auth middleware bypasses centralized errors.** It directly returns HTTP 401 responses and exposes JWT library error messages.
10. **CORS is unrestricted.** No origin, methods, headers, or credentials policy is configured.
11. **Cookies are unused.** Tokens are returned in response JSON even though cookie parsing is enabled; no `httpOnly`, `secure`, or `sameSite` cookie policy exists.
12. **No rate limiting or anti-abuse controls exist.** Login and password-reset endpoints can be repeatedly called.
13. **User enumeration is possible.** Signup and forgot-password responses reveal whether an email exists.
14. **Database startup sequencing is awkward.** `connectDB()` is called before `main.js` calls `dotenv.config()`, although `config/db.js` separately loads dotenv and makes the current code work. The server also starts without awaiting the database connection in `main.js`.
15. **Operational scripts need correction.** Production start uses Nodemon, and the test script recursively invokes itself.
16. **There are no automated tests.** Endpoint behavior, validation, authentication, and error paths are unverified by a test suite.
17. **Responses are not fully consistent.** Several handlers and middleware bypass `sendResponse` or the global error handler.
18. **Dependency hygiene needs review.** The npm `crypto` package and Nodemailer are unused, and Nodemon placement is production-oriented.
19. **Typographical and naming inconsistencies exist.** Examples include `forget-password`, `Toke not found`, and inconsistent capitalization in messages.

## 12. Context for the next AI

Treat the repository's live code and current Git status as authoritative. Before editing:

1. Read `package.json`, `main.js`, the auth router/controller/model, and all middleware/utilities.
2. Run `git status --short` and preserve unrelated user changes.
3. Never read back, print, commit, or reproduce actual `.env` values.
4. Keep ECMAScript-module imports with explicit `.js` extensions.
5. Preserve the current layered organization unless the requested change explicitly calls for a refactor.
6. Distinguish implemented behavior from intended behavior; in particular, do not describe refresh-token handling or email delivery as complete.
7. Add validation and tests alongside future authentication behavior where practical.
8. Avoid silently changing public response contracts. If consistency is improved, document the breaking or compatibility impact.
9. For production hardening, prioritize a real refresh-token contract, token-type enforcement, safe reset delivery/configurable URLs, input validation, profile-field filtering, constrained CORS, rate limiting, secure token storage strategy, corrected scripts, and automated tests.

The immediate project state is a functional learning-oriented authentication API, not a production-ready authentication service. Any future AI should confirm the desired security model and client contract before completing refresh tokens, cookies, password-reset email, or deployment behavior.
