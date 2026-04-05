import http from "node:http";
import { config as loadDotenv } from "dotenv";
import { notFound, serverError } from "../http.js";
import { handler as me } from "../handlers/me.js";
import { handler as patients } from "../handlers/patients.js";
import { handler as reports } from "../handlers/reports.js";
import { handler as patientLink } from "../handlers/patientLink.js";
loadDotenv();
const port = Number(process.env.PORT ?? 4000);
async function readBody(req) {
    const chunks = [];
    for await (const c of req)
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    return Buffer.concat(chunks).toString("utf8");
}
function toEvent(req, body) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string")
            headers[k] = v;
        else if (Array.isArray(v))
            headers[k] = v.join(",");
    }
    const query = {};
    for (const [k, v] of url.searchParams.entries())
        query[k] = v;
    return {
        httpMethod: req.method ?? "GET",
        path: url.pathname,
        headers,
        queryStringParameters: Object.keys(query).length ? query : null,
        body
    };
}
async function route(event) {
    if (event.path === "/me")
        return me(event);
    if (event.path === "/patients/link-user")
        return patientLink(event);
    if (event.path === "/patients" || event.path.startsWith("/patients/"))
        return patients(event);
    if (event.path === "/reports" || event.path.startsWith("/reports/"))
        return reports(event);
    return notFound();
}
const server = http.createServer(async (req, res) => {
    try {
        const body = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" ? await readBody(req) : null;
        const event = toEvent(req, body);
        const out = await route(event);
        res.statusCode = out.statusCode;
        for (const [k, v] of Object.entries(out.headers ?? {}))
            res.setHeader(k, v);
        res.end(out.body);
    }
    catch (e) {
        const out = serverError(e instanceof Error ? e.message : "Server error");
        res.statusCode = out.statusCode;
        for (const [k, v] of Object.entries(out.headers ?? {}))
            res.setHeader(k, v);
        res.end(out.body);
    }
});
server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend dev server listening on http://localhost:${port}`);
});
