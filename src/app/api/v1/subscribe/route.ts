import { NextRequest, NextResponse } from "next/server";
import { TIERS } from "@/lib/billing/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Start a Team subscription.
 *
 * Deliberately not gated behind a payment processor yet: the goal is a
 * working commercial path that proves people will pay for continuity, before
 * wiring a processor. The response hands the customer a capability token that
 * authorizes monitoring for the tier's target count. When a processor is
 * added it will wrap this exact contract.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tierName = String(body?.tier ?? "");
    const tier = TIERS[tierName as keyof typeof TIERS];

    if (!tier || tier.priceCents === 0) {
      return NextResponse.json(
        { error: "that tier has no self-serve checkout; contact sales" },
        { status: 400, headers: CORS },
      );
    }
    if (!body?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
      return NextResponse.json(
        { error: "a contact email is required" },
        { status: 400, headers: CORS },
      );
    }

    const token = crypto.randomUUID();

    return NextResponse.json(
      {
        tier: tier.name,
        priceCents: tier.priceCents,
        price: `$${(tier.priceCents / 100).toFixed(2)}`,
        monitoredTargets: tier.monitoredTargets,
        recheckHours: tier.recheckHours,
        /** Presented now; a processor will later issue it after payment. */
        capabilityToken: token,
        email: String(body.email),
        nextStep: `POST /api/v1/monitor with { token, target } to begin monitoring`,
      },
      {
        headers: {
          ...CORS,
          "cache-control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "bad request body" },
      { status: 400, headers: CORS },
    );
  }
}
