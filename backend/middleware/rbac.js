import { ForbiddenError } from "./errors.js";

export function requireRole(...roles) {
  return function (req, _res, next) {
    const user = req.user;
    if (!user) return next(new ForbiddenError("Missing user context"));
    if (!roles.includes(user.role)) return next(new ForbiddenError("Insufficient role"));
    return next();
  };
}

