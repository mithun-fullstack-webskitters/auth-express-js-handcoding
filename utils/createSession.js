import Session from "../model/session.model.js";
import hashToken from "./hashToken.js";
import { REFRESH_COOKIE_MAX_AGE } from "./utils.js";

const createSession = async (userId, refreshToken, device = "Unknown Device", browser = "Unknown Browser", ipAddress = "") => {
    return await Session.create({
        user: userId,
        hashedRefreshToken: hashToken(refreshToken),
        device,
        browser,
        ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE)
    })
};

export default createSession;