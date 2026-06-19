import { NextResponse } from "next/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validations/contact";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Trop de messages envoyés. Réessayez dans une heure." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }

    const { name, email, phone, message } = parsed.data;

    const {
      data: { user },
    } = await (await createClient()).auth.getUser();

    const db = tryCreateAdminClient() ?? (await createClient());

    const { data, error } = await db.rpc("create_admin_contact_chat", {
      p_name: name,
      p_email: email || null,
      p_phone: phone || null,
      p_message: message,
      p_user_id: user?.id || null,
    });

    if (error) {
      console.error("Contact error:", error.message, error.code, error.details);
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Impossible d'envoyer le message. Réessayez plus tard.",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Impossible de créer la conversation." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chatId: data,
      canOpenInApp: Boolean(user?.id),
    });
  } catch (err) {
    console.error("[contact] POST failed:", err);
    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}
