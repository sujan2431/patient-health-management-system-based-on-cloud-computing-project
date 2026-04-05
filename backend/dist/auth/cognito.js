import { CognitoJwtVerifier } from "aws-jwt-verify";
const allowedRoles = new Set(["Admin", "Doctor", "Patient"]);
export function makeCognitoVerifier(cfg) {
    return CognitoJwtVerifier.create({
        userPoolId: cfg.userPoolId,
        tokenUse: "id",
        clientId: cfg.clientId
    });
}
export function toAuthedUser(claims) {
    const sub = typeof claims.sub === "string" ? claims.sub : "";
    if (!sub)
        throw new Error("Missing sub");
    const email = typeof claims.email === "string" ? claims.email : undefined;
    // Recommended approach: store role in a custom attribute, eg: custom:role
    const rawRole = typeof claims["custom:role"] === "string" ? claims["custom:role"] : "Patient";
    const role = allowedRoles.has(rawRole) ? rawRole : "Patient";
    return { sub, email, role };
}
