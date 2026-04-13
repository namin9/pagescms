import { after } from "next/server";
import { handleActionWebhookEvent } from "@/lib/github-webhook-actions";
import { handleInstallationWebhookEvent } from "@/lib/github-webhook-installation";
import { handlePushWebhookEvent } from "@/lib/github-webhook-push";

export const runtime = "experimental-edge";
export const maxDuration = 60;

/**
 * Handles GitHub webhooks:
 * - Maintains tables related to GitHub installations (e.g. collaborators,
 *   installation tokens)
 * - Maintains GitHub cache (both files and permissions)
 * 
 * POST /api/webhook/github
 * 
 * Requires GitHub App webhook secret and signature.
 */
const processWebhookEvent = async (event: string | null, data: any) => {
  if (await handleInstallationWebhookEvent(event, data)) return;
  if (await handlePushWebhookEvent(event, data)) return;
  if (await handleActionWebhookEvent(event, data)) return;
};

async function verifySignature(secret: string, header: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const digest = "sha256=" + Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (header.length !== digest.length) return false;
  let result = 0;
  for (let i = 0; i < header.length; i++) {
    result |= header.charCodeAt(i) ^ digest.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("X-Hub-Signature-256");
    const event = request.headers.get("X-GitHub-Event");
    const body = await request.text();

    const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing GITHUB_APP_WEBHOOK_SECRET");
      return Response.json(null, { status: 500 });
    }

    if (!signature || !(await verifySignature(secret, signature, body))) {
      return Response.json(null, { status: 401 });
    }

    const data = JSON.parse(body);

    after(async () => {
      try {
        await processWebhookEvent(event, data);
      } catch (error: any) {
        console.error("Error in Webhook", {
          error,
          event,
          payload: data,
          action: data?.action,
        });
      }
    });

    return Response.json(null, { status: 200 });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return Response.json(null, { status: 500 });
  }
}
