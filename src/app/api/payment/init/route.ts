import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const UDDOKTAPAY_API_KEY = process.env.UDDOKTAPAY_API_KEY!;
const UDDOKTAPAY_BASE_URL = process.env.UDDOKTAPAY_BASE_URL!;
const PRICE_PER_KEY = 199; // BDT

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Firebase Auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. Parse and validate request body
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || typeof quantity !== "number" || quantity < 5) {
      return NextResponse.json(
        { error: "Minimum purchase is 5 keys." },
        { status: 400 }
      );
    }

    const amount = quantity * PRICE_PER_KEY;

    // 3. Get user info from Firebase Auth
    const userRecord = await adminAuth.getUser(uid);
    const fullName = userRecord.displayName || "Retailer";
    const email = userRecord.email || "no-email@example.com";

    // 4. Create a pending payment record in Firestore
    const paymentRef = adminDb.collection("Payments").doc();
    await paymentRef.set({
      uid,
      quantity,
      amount,
      currency: "BDT",
      status: "pending",
      created_at: FieldValue.serverTimestamp(),
    });

    // 5. Determine the origin for redirect URLs
    const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || "http://localhost:9002";

    // 6. Call UddoktaPay checkout API
    const uddoktaResponse = await fetch(`${UDDOKTAPAY_BASE_URL}/checkout-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify({
        full_name: fullName,
        email: email,
        amount: amount.toString(),
        metadata: {
          uid,
          quantity,
          payment_id: paymentRef.id,
        },
        redirect_url: `${origin}/pricing/success`,
        cancel_url: `${origin}/pricing/cancel`,
        return_type: "GET",
      }),
    });

    if (!uddoktaResponse.ok) {
      const errorData = await uddoktaResponse.text();
      console.error("UddoktaPay init error:", errorData);

      // Update payment record to failed
      await paymentRef.update({ status: "failed", error: errorData });

      return NextResponse.json(
        { error: "Failed to initialize payment. Please try again." },
        { status: 502 }
      );
    }

    const uddoktaData = await uddoktaResponse.json();

    // 7. Store the invoice URL/details and return payment URL
    await paymentRef.update({
      payment_url: uddoktaData.payment_url,
    });

    return NextResponse.json({
      payment_url: uddoktaData.payment_url,
      payment_id: paymentRef.id,
    });
  } catch (error: any) {
    console.error("Payment init error:", error);

    if (error.code === "auth/id-token-expired" || error.code === "auth/argument-error") {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
