export interface ParsedCookie {
  name: string;
  value: string;
  options: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  };
}

/** Lê um `Set-Cookie` da API do chat para repassá-lo ao navegador com `cookies().set()`. */
export function parseSetCookie(header: string): ParsedCookie | null {
  const [pair, ...attributes] = header.split(";").map((part) => part.trim());
  const separator = pair?.indexOf("=") ?? -1;
  if (!pair || separator <= 0) return null;
  const parsed: ParsedCookie = {
    name: pair.slice(0, separator),
    value: decodeURIComponent(pair.slice(separator + 1)),
    options: {},
  };
  for (const attribute of attributes) {
    const [rawKey = "", ...rest] = attribute.split("=");
    const key = rawKey.toLowerCase();
    const value = rest.join("=");
    if (key === "path") parsed.options.path = value;
    else if (key === "domain") parsed.options.domain = value;
    else if (key === "max-age") parsed.options.maxAge = Number(value);
    else if (key === "expires") parsed.options.expires = new Date(value);
    else if (key === "httponly") parsed.options.httpOnly = true;
    else if (key === "secure") parsed.options.secure = true;
    else if (key === "samesite") parsed.options.sameSite = value.toLowerCase() as "lax" | "strict" | "none";
  }
  return parsed;
}
