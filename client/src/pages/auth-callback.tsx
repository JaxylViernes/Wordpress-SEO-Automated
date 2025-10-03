import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Authenticating with Google...');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state'); 
        
        // Check for errors from Google
        if (error) {
          setStatus('error');
          setMessage('Authentication failed');
          
          if (error === 'access_denied') {
            setErrorDetails('You denied access to Google Search Console');
          } else {
            setErrorDetails(`Google returned an error: ${error}`);
          }
          
          // Redirect after showing error
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              setLocation('/google-search-console');
            }
          }, 3000);
          return;
        }
        
        // Check if we have the authorization code
        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          setErrorDetails('The callback URL is missing the authorization code');
          
          setTimeout(() => {
            if (window.opener) {
              window.close();
            } else {
              setLocation('/google-search-console');
            }
          }, 3000);
          return;
        }
        
        if (window.opener) {
          setMessage('Sending credentials to main window...');
          
          try {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              code: code,
              state: state
            }, window.location.origin);
            
            setStatus('success');
            setMessage('Authentication successful!');
            setTimeout(() => {
              window.close();
            }, 1500);
          } catch (err) {
            setStatus('error');
            setMessage('Failed to communicate with main window');
            setErrorDetails('Please close this window and try again');
          }
        } else {
          setMessage('Completing authentication...');
          
          try {
            const response = await fetch('http://localhost:5000/api/gsc/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ code, state })
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.account) {
              const existingAccounts = JSON.parse(localStorage.getItem('gsc_accounts') || '[]');
              const accountExists = existingAccounts.some((acc: any) => acc.id === data.account.id);
              
              if (!accountExists) {
                existingAccounts.push(data.account);
                localStorage.setItem('gsc_accounts', JSON.stringify(existingAccounts));
              }
            }
            
            setStatus('success');
            setMessage('Authentication successful!');
            setTimeout(() => {
              setLocation('/google-search-console');
            }, 1500);
            
          } catch (err) {
            setStatus('error');
            setMessage('Failed to complete authentication');
            setErrorDetails(err instanceof Error ? err.message : 'Unknown error occurred');
            setTimeout(() => {
              setLocation('/google-search-console');
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('An unexpected error occurred');
        setErrorDetails(err instanceof Error ? err.message : 'Unknown error');
        
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            setLocation('/google-search-console');
          }
        }, 3000);
      }
    };
    
    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mb-4">
            {status === 'processing' && (
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-600 mx-auto" />
            )}
          </div>
          
          {/* Status Message */}
          <h2 className={`text-xl font-semibold mb-2 ${
            status === 'success' ? 'text-green-900' :
            status === 'error' ? 'text-red-900' :
            'text-gray-900'
          }`}>
            {message}
          </h2>
          
          {/* Error Details */}
          {errorDetails && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="ml-2 text-sm text-red-800">
                  {errorDetails}
                </p>
              </div>
            </div>
          )}
          
          {/* Additional Info */}
          {status === 'processing' && (
            <p className="text-sm text-gray-600 mt-2">
              Please wait while we complete the authentication process...
            </p>
          )}
          
          {status === 'success' && (
            <p className="text-sm text-gray-600 mt-2">
              {window.opener 
                ? 'This window will close automatically...'
                : 'Redirecting to Google Search Console...'}
            </p>
          )}
          
          {status === 'error' && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-3">
                {window.opener 
                  ? 'This window will close automatically...'
                  : 'Redirecting back...'}
              </p>
              <button
                onClick={() => {
                  if (window.opener) {
                    window.close();
                  } else {
                    setLocation('/google-search-console');
                  }
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                {window.opener ? 'Close Window' : 'Go Back'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;