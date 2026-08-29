export default async () => Response.json({ ok: true, service: "jamb123bot-backend", bot: "@jamb123bot", host: "netlify" });

export const config = { path: "/health" };
