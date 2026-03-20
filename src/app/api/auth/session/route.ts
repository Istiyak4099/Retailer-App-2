import { NextResponse } from 'next/server';
import { SessionData } from '@/lib/types';

/**
 * API route to retrieve the current session data.
 * 
 * - UPDATED: Returns a mock session for testing when login is disabled.
 */

export async function GET() {
  try {
    // Return a default mock session to bypass login requirement
    const mockSession: SessionData = {
      userId: 'default-user',
      mobileNumber: '+8801700000000',
      name: 'Test Retailer',
      role: 'Retailer',
      shopName: 'Demo Gadget Shop',
      dealerCode: 'D-101',
    };
    
    return NextResponse.json(mockSession, { status: 200 });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
