export type Role = "Admin" | "Doctor" | "Patient";

export type ApiEvent = {
  httpMethod: string;
  path: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  pathParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  requestContext?: unknown;
};

export type ApiResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

export type AuthedUser = {
  sub: string;
  email?: string;
  role: Role;
};

