import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const UDDOKTAPAY_API_KEY = process.env.UDDOKTAPAY_API_KEY!;
const UDDOKTAPAY_BASE_URL = process.env.UDDOKTAPAY_BASE_URL!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id || typeof invoice_id !== "string") {
      return NextResponse.json(
        { error: "Missing invoice_id" },
        { status: 400 }
      );
    }

    // 1. Call UddoktaPay verify API
    const verifyResponse = await fetch(`${UDDOKTAPAY_BASE_URL}/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.text();
      console.error("UddoktaPay verify error:", errorData);
      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 502 }
      );
    }

    const verifyData = await verifyResponse.json();

    // 2. Check payment status from UddoktaPay
    if (verifyData.status !== "COMPLETED") {
      return NextResponse.json({
        success: false,
        status: verifyData.status,
        message: "Payment was not completed.",
      });
    }

    // 3. Extract metadata
    const metadata = verifyData.metadata || {};
    const uid = metadata.uid;
    const quantity = Number(metadata.quantity);
    const paymentId = metadata.payment_id;

    if (!uid || !quantity || !paymentId) {
      console.error("Missing metadata in verified payment:", verifyData);
      return NextResponse.json(
        { error: "Invalid payment metadata." },
        { status: 400 }
      );
    }

    // 4. Check if this payment was already processed (idempotency)
    const paymentDoc = await adminDb.collection("Payments").doc(paymentId).get();
    if (paymentDoc.exists && paymentDoc.data()?.status === "completed") {
      // Already processed, return success without double-crediting
      return NextResponse.json({
        success: true,
        quantity,
        message: "Payment already processed.",
        already_processed: true,
      });
    }

    // 5. Credit keys and update payment record atomically
    const batch = adminDb.batch();

    // Update payment record
    const paymentRef = adminDb.collection("Payments").doc(paymentId);
    batch.update(paymentRef, {
      status: "completed",
      invoice_id,
      transaction_id: verifyData.transaction_id || null,
      payment_method: verifyData.payment_method || null,
      sender_number: verifyData.sender_number || null,
      completed_at: FieldValue.serverTimestamp(),
      raw_response: verifyData,
    });

    // Increment key balance
    const retailerRef = adminDb.collection("Retailers").doc(uid);
    batch.update(retailerRef, {
      key_balance: FieldValue.increment(quantity),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      quantity,
      message: `Successfully added ${quantity} keys to your balance.`,
    });
  } catch (error: any) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: "Internal server error during verification." },
      { status: 500 }
    );
  }
}
