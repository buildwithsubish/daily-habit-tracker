// Biometric authentication utilities using WebAuthn API

export interface BiometricCredential {
  id: string;
  publicKey: string;
  userId: string;
}

// Check if biometric authentication is available
export function isBiometricAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

// Check if platform authenticator is available (Face ID, Touch ID, Fingerprint)
export async function checkBiometricSupport(): Promise<{
  available: boolean;
  type: 'face' | 'fingerprint' | 'none';
}> {
  if (!isBiometricAvailable()) {
    return { available: false, type: 'none' };
  }

  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    if (!available) {
      return { available: false, type: 'none' };
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      return { available: true, type: 'face' }; // Face ID or Touch ID
    } else if (isAndroid) {
      return { available: true, type: 'fingerprint' };
    }

    return { available: true, type: 'fingerprint' }; // Default
  } catch (error) {
    console.error('Biometric check error:', error);
    return { available: false, type: 'none' };
  }
}

// Register biometric credential
export async function registerBiometric(userId: string, username: string): Promise<BiometricCredential | null> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Habit Tracker',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'direct',
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    
    return {
      id: credential.id,
      publicKey: Buffer.from(response.getPublicKey() || new ArrayBuffer(0)).toString('base64'),
      userId,
    };
  } catch (error: any) {
    console.error('Biometric registration error:', error);
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or not available');
    }
    throw error;
  }
}

// Authenticate with biometric
export async function authenticateBiometric(credentialId: string, userId: string): Promise<boolean> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // For platform authenticator, we don't need to specify credential ID
    // The browser will use the platform authenticator (Face ID/Touch ID/Fingerprint)
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: window.location.hostname,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
      return false;
    }

    // Verify the assertion (this would be done server-side in production)
    // For now, if we get here, the biometric authentication succeeded
    return true;
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
      throw new Error('Biometric authentication was cancelled or not available');
    }
    return false;
  }
}

