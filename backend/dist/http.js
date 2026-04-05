const defaultHeaders = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
};
export function json(statusCode, data, extraHeaders) {
    return {
        statusCode,
        headers: { ...defaultHeaders, ...(extraHeaders ?? {}) },
        body: JSON.stringify(data)
    };
}
export function ok(data) {
    return json(200, data);
}
export function badRequest(message, details) {
    return json(400, { error: "bad_request", message, details });
}
export function unauthorized(message = "Unauthorized") {
    return json(401, { error: "unauthorized", message });
}
export function forbidden(message = "Forbidden") {
    return json(403, { error: "forbidden", message });
}
export function notFound(message = "Not found") {
    return json(404, { error: "not_found", message });
}
export function serverError(message = "Server error") {
    return json(500, { error: "server_error", message });
}
