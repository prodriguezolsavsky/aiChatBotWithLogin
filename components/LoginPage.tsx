import React from 'react';

interface LoginPageProps {
  gsiLoaded: boolean;
  isClientIDConfigured: boolean;
  googleSignInButtonId: string;
  gsiError: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  gsiLoaded, 
  isClientIDConfigured, 
  googleSignInButtonId,
  gsiError 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 sm:p-10 md:p-12 rounded-xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-blue-400">Welcome!</h1>
        <p className="text-gray-300 mb-8 sm:mb-10 text-sm sm:text-base">
          Sign in with your Google account to access the AI Chat Assistant.
        </p>
        
        <div id={googleSignInButtonId} className="flex justify-center items-center min-h-[40px] mb-4">
          {/* Google Sign-In button will be rendered here by GSI library */}
          {!gsiLoaded && <span className="text-sm text-gray-400">Loading Sign-In options...</span>}
          {gsiLoaded && !isClientIDConfigured && null} {/* Error message below will cover this */}
        </div>

        {gsiError && (
          <div 
            className="mt-4 p-3 bg-red-700 border border-red-600 text-red-100 rounded-md text-sm" 
            role="alert"
          >
            <p className="font-semibold">Sign-In Error:</p>
            <p>{gsiError}</p>
          </div>
        )}
         {!gsiError && gsiLoaded && !isClientIDConfigured && (
           <div 
            className="mt-4 p-3 bg-yellow-700 border border-yellow-600 text-yellow-100 rounded-md text-sm" 
            role="alert"
          >
            <p className="font-semibold">Configuration Issue:</p>
            <p>Google Sign-In is not available due to a configuration problem. Please contact the site administrator.</p>
          </div>
        )}
        <p className="mt-8 text-xs text-gray-500">
          Your conversations will be stored locally in your browser.
        </p>
      </div>
       <footer className="absolute bottom-4 text-center w-full text-gray-600 text-xs">
          AI Chat Assistant
        </footer>
    </div>
  );
};
