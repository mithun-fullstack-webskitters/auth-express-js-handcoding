import { REFRESH_COOKIE_MAX_AGE } from "./utils.js";

const cookieOptions = {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // It prevents the browser from sending a cookie in all cross-site requests. The cookie is only included if the request originates from the exact same domain that set the cookie

    maxAge: REFRESH_COOKIE_MAX_AGE
};

export default cookieOptions;