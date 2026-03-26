import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

import { googleAuthConfig } from '../../config/googleAuth.js';
import useAuth from '../../hooks/useAuth.js';

export default function GoogleLoginButton() {
  const { authenticating, login } = useAuth();
  const [error, setError] = useState('');
  const googleSetupHint = googleAuthConfig.currentOrigin
    ? `If Google shows "origin_mismatch", add ${googleAuthConfig.currentOrigin} to the Authorized JavaScript origins of this Google OAuth client.`
    : '';

  if (!googleAuthConfig.hasClientId) {
    return (
      <div>
        <button className="btn-secondary cursor-not-allowed opacity-70" disabled type="button">
          Set Google Client ID
        </button>
        <p className="mt-2 max-w-md text-xs text-red-600">
          Set `VITE_GOOGLE_CLIENT_ID` or an origin-specific Google client ID in `client/.env`.
        </p>
      </div>
    );
  }

  return (
    <div className={authenticating ? 'pointer-events-none opacity-60' : ''}>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          if (credentialResponse.credential) {
            try {
              setError('');
              await login(credentialResponse.credential);
            } catch (loginError) {
              setError(loginError.response?.data?.message || 'Google sign-in failed.');
            }
          }
        }}
        onError={() =>
          setError(
            googleAuthConfig.currentOrigin
              ? `Google sign-in failed for ${googleAuthConfig.currentOrigin}. Make sure this exact origin is allowed in Google Cloud and matches the selected client ID.`
              : 'Google sign-in failed.'
          )
        }
        text="signin_with"
        shape="pill"
        width="220"
      />
      {googleAuthConfig.isLanOrigin ? (
        <p className="mt-2 max-w-md text-xs text-slate-500">
          {googleSetupHint}
          {' '}
          If your Google consent screen is in testing mode, add this Gmail account as a test user too.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
