import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import User from '@/lib/models/User';
import WhatsAppVerification from '@/lib/models/WhatsAppVerification';
import AuditLog from '@/lib/models/AuditLog';
import Admin from '@/lib/models/Admin';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import connectDB from '@/lib/mongodb';
import { encrypt, hashPhoneNumber, validatePhoneNumber, formatPhoneNumber, maskPhoneNumber } from '@/lib/security';
import whatsappClientManager from '@/lib/whatsapp-web';

const PYTHON_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8765';

async function resolveAdminSessionId(): Promise<string> {
  // Prefer a WhatsAppSession linked to the Admin user (connected). Then any connected session. Then env ADMIN_ID or 'admin'.
  try {
    const adminUser = await Admin.findOne({ role: 'admin' }).select('_id').lean().catch(() => null);
    const adminUserId = (adminUser as any)?._id?.toString();

    if (adminUserId) {
      // Try both adminIdString and adminId (ObjectId cast) to be robust
      const wsLinked = await (WhatsAppSession as any).findOne({
        $or: [{ adminIdString: adminUserId }, { adminId: adminUserId }],
        status: 'connected'
      }).lean().catch(() => null);
      if (wsLinked && wsLinked.ADMIN_SESSION_ID) {
        console.log('[WhatsApp Verify] resolveAdminSessionId: using linked DB session', wsLinked.ADMIN_SESSION_ID);
        return wsLinked.ADMIN_SESSION_ID;
      }
    }

    // Check in-memory instances first (they take priority)
    try {
      const mgrAny = whatsappClientManager as any;
      const instances: Map<string, any> | undefined = mgrAny && mgrAny.instances;
      if (instances && instances instanceof Map) {
        for (const [key, inst] of instances.entries()) {
          if (inst && inst.status === 'connected') {
            console.log('[WhatsApp Verify] resolveAdminSessionId: using in-memory connected instance', key);
            return key;
          }
        }
      }
    } catch (e) {
      console.warn('[WhatsApp Verify] resolveAdminSessionId: error checking instances', e);
    }

    // Query database for ANY connected session (most important fallback)
    // This is the key fix - find ANY session with status 'connected' regardless of ID
    const anyConnected = await (WhatsAppSession as any).findOne({ 
      status: 'connected'
    }).sort({ lastConnectedAt: -1 }).lean().catch(() => null);
    
    if (anyConnected) {
      // Try ADMIN_SESSION_ID first, then adminIdString, then adminId
      const sessionId = anyConnected.ADMIN_SESSION_ID || anyConnected.adminIdString || anyConnected.adminId?.toString();
      if (sessionId) {
        console.log('[WhatsApp Verify] resolveAdminSessionId: using connected DB session:', sessionId);
        return sessionId;
      }
    }
    
    // If no connected session found, try to find any saved session and auto-connect
    const savedSession = await (WhatsAppSession as any).findOne({ 
      sessionData: { $exists: true, $ne: '' }
    }).sort({ lastConnectedAt: -1 }).lean().catch(() => null);
    
    if (savedSession) {
      const sessionId = savedSession.ADMIN_SESSION_ID || savedSession.adminIdString || savedSession.adminId?.toString();
      if (sessionId) {
        console.log('[WhatsApp Verify] resolveAdminSessionId: found saved session, triggering auto-connect:', sessionId);
        // Try to auto-connect using this session ID
        try {
          const { autoConnectWhatsApp } = await import('@/lib/whatsapp-auto-connect');
          await autoConnectWhatsApp(sessionId);
          // Wait a moment for connection to establish
          await new Promise(resolve => setTimeout(resolve, 3000));
          // Check if connected now
          const status = await whatsappClientManager.getStatus(sessionId);
          if (status.status === 'connected') {
            console.log('[WhatsApp Verify] resolveAdminSessionId: auto-connected successfully');
            return sessionId;
          }
        } catch (e) {
          console.warn('[WhatsApp Verify] resolveAdminSessionId: auto-connect failed', e);
        }
      }
    }
  } catch (e) {
    console.warn('[WhatsApp Verify] resolveAdminSessionId: error', e);
  }

  return process.env.ADMIN_ID || 'admin';
}

async function checkOrCreateContact(username: string, phoneNumber: string, savedContactName?: string): Promise<{ success: boolean; action?: string; error?: string; existingContactName?: string; existingPhoneNumber?: string }> {
  try {
    const adminId = await resolveAdminSessionId();
    console.log('[WhatsApp Verify] Resolved admin session ID for verification:', adminId);
    
    // Verify that admin session is connected first
    const status = await whatsappClientManager.getStatus(adminId);
    
    if (status.status !== 'connected') {
      return { 
        success: false, 
        error: 'WhatsApp is not connected. Please connect WhatsApp from admin dashboard first.' 
      };
    }

    // Increased timeout to 30 seconds to allow Python server time for contact operations
    // Contact check/create can take 15-30+ seconds due to browser automation
    const TIMEOUT_MS = 30000;
    const MAX_RETRIES = 2;

    // If we have a saved contact name, try to find and use that contact first
    if (savedContactName && savedContactName.trim().length > 0) {
      console.log(`[WhatsApp Verify] Checking if saved contact exists in WhatsApp: ${savedContactName}`);
      
      try {
        const checkResponse = await fetch(`${PYTHON_SERVER_URL}/contact/check?session_id=${adminId}&contact_name=${encodeURIComponent(savedContactName)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          if (checkResult.exists) {
            console.log(`[WhatsApp Verify] Found saved contact in WhatsApp: ${savedContactName}`);
            return { 
              success: true, 
              action: 'already_exists',
              existingContactName: savedContactName,
              error: undefined
            };
          }
        }
      } catch (e) {
        console.warn('[WhatsApp Verify] Failed to check saved contact, proceeding with creation:', e);
      }
    }
    
    const makeRequestWithRetry = async (attempt: number): Promise<any> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      try {
        // Extract local phone number (without country code) for WhatsApp contact creation
        // phoneNumber here is already formatted with country code (e.g., "9191919191" or "919876543210")
        const cleanedPhone = phoneNumber.replace(/\D/g, '');
        
        // Properly extract local number:
        // - If it starts with 91 AND results in a 10-digit local number, it's already properly formatted
        // - Strip country code "91" only if the local part is still 10+ digits
        let localPhone = cleanedPhone;
        if (cleanedPhone.startsWith('91')) {
          const potentialLocal = cleanedPhone.substring(2);
          // Only strip if the resulting local number is at least 10 digits
          // Otherwise, the "91" is part of the local number itself (e.g., "9191919191")
          if (potentialLocal.length >= 10) {
            localPhone = potentialLocal;
          }
          // If localPhone would be < 10 digits, keep the original (e.g., "9191919191" stays as-is)
        }
        
        const response = await fetch(`${PYTHON_SERVER_URL}/contact/open-or-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: adminId,
            contact_name: username,
            // Send local phone number (without country code) for WhatsApp contact creation
            phone_number: localPhone
          })
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.detail || 'Failed to create/open contact' 
          };
        }
        
        const result = await response.json();
        
        // Handle the case where contact already exists
        if (result.action === 'already_exists') {
          console.log('[WhatsApp Verify] Contact already exists:', result.existing_contact_name, result.existing_phone_number);
          return { 
            success: true, 
            action: 'already_exists',
            existingContactName: result.existing_contact_name,
            existingPhoneNumber: result.existing_phone_number,
            error: undefined
          };
        }
        
        return { success: result.success, action: result.action, error: result.error };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Try with retry logic for transient failures
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await makeRequestWithRetry(attempt);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[WhatsApp] Attempt ${attempt}/${MAX_RETRIES} failed:`, error);
        
        if (error instanceof Error) {
          // Don't retry onAbortError - it's a timeout, which needs longer timeout not retry
          if (error.name === 'AbortError') {
            // This is a timeout - don't retry, just fail with better message
            return { 
              success: false, 
              error: 'Contact creation request timeout. WhatsApp server took too long to respond. Please try again.' 
            };
          }
          
          // Retry on network errors
          if (attempt < MAX_RETRIES) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.log(`[WhatsApp] Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
        }
        
        // Final attempt failed
        return { 
          success: false, 
          error: 'Failed to verify contact. WhatsApp connection may be unstable.' 
        };
      }
    }
    
    // Should not reach here, but just in case
    return { 
      success: false, 
      error: lastError?.message || 'Failed to verify contact after retries' 
    };
  } catch (error) {
    console.error('[WhatsApp] Error checking/creating contact:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Contact creation request timeout. WhatsApp server may be slow or unreachable.' };
    }
    return { success: false, error: 'Failed to verify contact. WhatsApp connection may be unstable.' };
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, phoneNumber } = body;
    
    console.log(`[WhatsApp Verify] Starting verification for user: ${userId}, phone: ${phoneNumber ? '***' + phoneNumber.slice(-4) : 'N/A'}`);

    if (!userId || !phoneNumber) {
      return NextResponse.json(
        { error: 'User ID and phone number are required' },
        { status: 400 }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const phoneHash = hashPhoneNumber(formattedPhone);
    const username = user.username || `User_${userId.slice(0, 8)}`;

    // Check if this phone number is already linked to this user (already verified)
    if (user.whatsappNumber === formattedPhone && user.whatsappVerified) {
      console.log(`[WhatsApp Verify] User ${userId} already verified for phone ${formattedPhone}`);
      return NextResponse.json(
        { 
          error: 'This number is already verified for your account', 
          alreadyVerified: true,
          skipVerification: true // Frontend can skip to settings
        },
        { status: 400 }
      );
    }

    // Check if user is already verified with any number - skip OTP for verified users
    if (user.whatsappVerified && user.whatsappNumber) {
      console.log(`[WhatsApp Verify] User ${userId} already verified with ${user.whatsappNumber}, new number requested`);
      // Allow number change but require verification for new number
      // Continue with normal flow for number change
    }

    // Check if phone number is linked to another user
    const existingUser = await User.findOne({
      whatsappNumberHash: phoneHash,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This phone number is already linked to another account' },
        { status: 409 }
      );
    }

    // Check for existing pending verification
    const existingPending = await WhatsAppVerification.findOne({
      userId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingPending) {
      const timeSinceSent = Date.now() - existingPending.createdAt.getTime();
      if (timeSinceSent < 60000) {
        const waitSeconds = Math.ceil((60000 - timeSinceSent) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code.`, canResend: false, waitSeconds },
          { status: 429 }
        );
      }
    }

    // Determine contact name to use
    let contactName = username;
    let contactResult: { success: boolean; action?: string; error?: string; existingContactName?: string; existingPhoneNumber?: string } | null = null;

    // OPTIMIZATION: Check if User already has a saved WhatsApp contact name
    // Skip Python server call if contact name already exists - saves time and avoids timeout
    const savedContactName = (user as any).whatsappContactName;
    const hasSavedContact = savedContactName && savedContactName.trim().length > 0;

    if (hasSavedContact) {
      // Use saved contact name - skip Python server contact check/create
      contactName = savedContactName;
      contactResult = { success: true, action: 'already_exists', existingContactName: contactName };
      console.log(`[WhatsApp Verify] Using saved WhatsApp contact name from DB: ${contactName} (skipping Python server call)`);
    } else {
      // No saved contact name - need to check/create contact via Python server
      // Pass savedContactName to check if it already exists in WhatsApp first
      contactResult = await checkOrCreateContact(username, formattedPhone, savedContactName);
      
      if (!contactResult.success) {
        console.error(`[WhatsApp Verify] Failed to create/open contact: ${contactResult.error}`);
        return NextResponse.json(
          { error: contactResult.error || 'Failed to create WhatsApp contact. Make sure WhatsApp Web is connected.' },
          { status: 500 }
        );
      }
      
      console.log(`[WhatsApp Verify] Contact action: ${contactResult.action}`);

      // Determine the contact name to use - prefer existing WhatsApp contact name
      if (contactResult.action === 'already_exists') {
        // First priority: Use actual WhatsApp extracted Contact Name
        if (contactResult.existingContactName) {
          contactName = String(contactResult.existingContactName);
          console.log('[WhatsApp Verify] Using extracted WhatsApp Contact Name:', contactName);
        }
      }
    }

    // Log contact creation/opening
    await AuditLog.create({
      userId,
      action: hasSavedContact ? 'whatsapp_contact_used_saved' : (contactResult?.action === 'created' ? 'whatsapp_contact_created' : (contactResult?.action === 'already_exists' ? 'whatsapp_contact_already_exists' : 'whatsapp_contact_opened')),
      category: 'whatsapp_verification',
      details: `WhatsApp contact "${contactName}" used for verification`,
      success: true,
    });

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old pending verifications
    await WhatsAppVerification.deleteMany({ userId, status: 'pending' });

    await WhatsAppVerification.create({
      userId,
      phoneNumber: formattedPhone,
      phoneNumberEncrypted: encrypt(formattedPhone),
      verificationCode,
      status: 'pending',
      expiresAt,
      contactName: contactName, // Save the contact name
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    const maskedPhone = maskPhoneNumber(formattedPhone);

    // Send verification code via WhatsApp using contact name with timeout
    let result = { ok: false, error: 'WhatsApp client not connected' };

    try {
      // Resolve admin session id to use for sending as well
      const sendAdminId = await resolveAdminSessionId();
      console.log('[WhatsApp Verify] Using admin session id for sendVerificationCode:', sendAdminId);
      
      // Set a 45 second timeout for sending code (exceeds 35s API timeout + buffer)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Verification code send timeout after 45 seconds')), 45000)
      );
      
      // Use contactName for sending the code (the actual WhatsApp contact name)
      const pythonResult = await Promise.race([
        whatsappClientManager.sendVerificationCode(sendAdminId, formattedPhone, verificationCode, contactName),
        timeoutPromise
      ]) as { success: boolean; error?: string };
      
      if (pythonResult && pythonResult.success) {
        result = { ok: true, error: '' };
        console.log(`[WhatsApp Verify] Code sent to contact: ${contactName}`);
      } else {
        result = { ok: false, error: pythonResult?.error || 'Failed to send code' };
      }
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error('[WhatsApp Verify] Failed to send code:', result.error);
    }

    if (!result.ok) {
      await WhatsAppVerification.updateOne(
        { userId, status: 'pending' },
        { status: 'failed', $set: { expiresAt: new Date() } }
      );

      await AuditLog.create({
        userId,
        action: 'verification_code_send_failed',
        category: 'whatsapp_verification',
        details: `Failed to send code to ${maskedPhone}: ${result.error}`,
        errorMessage: result.error,
        success: false,
      });

      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    // IMPORTANT: Save contact name to User model for future verification attempts
    // This avoids Python server call on subsequent verifications
    if (!hasSavedContact && contactName && contactName.trim()) {
      try {
        await User.findByIdAndUpdate(userId, {
          whatsappContactName: contactName
        });
        console.log(`[WhatsApp Verify] Saved contact name to User model: ${contactName}`);
      } catch (e) {
        console.warn('[WhatsApp Verify] Failed to save contact name to User:', e);
      }
    }

    await AuditLog.create({
      userId,
      action: 'verification_code_sent',
      category: 'whatsapp_verification',
      details: `Code sent to ${username} (${maskedPhone})`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      maskedPhone,
      contactCreated: contactResult?.action === 'created',
    });
  } catch (error: any) {
    console.error('[WhatsApp Verify] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, verificationCode } = body;

    if (!userId || !verificationCode) {
      return NextResponse.json(
        { error: 'User ID and verification code are required' },
        { status: 400 }
      );
    }

    const verification = await WhatsAppVerification.findOne({
      userId,
      verificationCode,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      await AuditLog.create({
        userId,
        action: 'verification_code_invalid',
        category: 'whatsapp_verification',
        details: 'Invalid or expired verification code',
        success: false,
      });

      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    verification.status = 'verified';
    verification.verifiedAt = new Date();
    verification.attempts += 1;
    await verification.save();

    const formattedPhone = verification.phoneNumber;
    const phoneHash = hashPhoneNumber(formattedPhone);
    
    // Get the contact name from the verification record
    const contactName = verification.contactName;
    
    await User.findByIdAndUpdate(userId, {
      whatsappNumber: formattedPhone,
      whatsappNumberEncrypted: encrypt(formattedPhone),
      whatsappNumberHash: phoneHash,
      whatsappVerified: true,
      whatsappAutomation: true,
      whatsappContactName: contactName || undefined,
    });

    await AuditLog.create({
      userId,
      action: 'verification_completed',
      category: 'whatsapp_verification',
      details: `Phone number verified: ${maskPhoneNumber(formattedPhone)}`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
    });
  } catch (error: any) {
    console.error('[WhatsApp Verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
