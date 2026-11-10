import { json, route } from "@/lib/server/http";
import { getCurrentUser } from "@/lib/server/session";

export const GET = route(async () => json({ user: await getCurrentUser() }));
