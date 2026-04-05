import { forbidden, unauthorized } from "../http.js";
import { loadConfig } from "../config.js";
import { makeCognitoVerifier, toAuthedUser } from "./cognito.js";
let verifier = null;
function getVerifier() {
    if (verifier)
        return verifier;
    const cfg = loadConfig();
    verifier = makeCognitoVerifier({
        userPoolId: cfg.COGNITO_USER_POOL_ID,
        clientId: cfg.COGNITO_CLIENT_ID
    });
    return verifier;
}
function getBearer(headers) {
    const h = headers ?? {};
    const auth = h.authorization ?? h.Authorization ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return m?.[1] ?? null;
}
export async function requireAuth(event) {
    const token = getBearer(event.headers);
    if (!token)
        return { response: unauthorized("Missing Bearer token") };
    try {
        const payload = await getVerifier().verify(token);
        const user = toAuthedUser(payload);
        return { user };
    }
    catch {
        return { response: unauthorized("Invalid token") };
    }
}
export function requireRole(user, allowed) {
    if (!allowed.includes(user.role))
        return forbidden("Insufficient role");
    return null;
}
