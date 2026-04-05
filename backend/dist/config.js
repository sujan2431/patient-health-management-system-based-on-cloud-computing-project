import { z } from "zod";
const EnvSchema = z.object({
    AWS_REGION: z.string().min(1),
    COGNITO_USER_POOL_ID: z.string().min(1),
    COGNITO_CLIENT_ID: z.string().min(1),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    S3_BUCKET: z.string().min(1)
});
export function loadConfig() {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`);
        throw new Error(`Invalid environment:\n${issues.join("\n")}`);
    }
    return parsed.data;
}
