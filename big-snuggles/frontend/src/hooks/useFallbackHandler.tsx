/**
 * Frontend Text Fallback Handler
 * Manages graceful degradation from voice to text mode on the client side
 */

import { useState, useCallback, useEffect } from 'react';

export interface FallbackStatus {
  active: boolean;
  reason: string | null;
  message: string | null;
  canRetry: boolean;
  retryAttempts: number;
}

export const useFallbackHandler = () => {
  const [fallbackStatus, setFallbackStatus] = useState<FallbackStatus>({
    active: false,
    reason: null,
    message: null,
    canRetry: false,
    retryAttempts: 0
  });

  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Activate fallback mode
   */
  const activateFallback = useCallback((reason: string, message: string, canRetry = true) => {
    console.log(`[FallbackHandler] Activating fallback: ${reason}`);
    
    setFallbackStatus({
      active: true,
      reason,
      message,
      canRetry,
      retryAttempts: 0
    });

    // Show user notification
    showFallbackNotification(message);
  }, []);

  /**
   * Deactivate fallback mode
   */
  const deactivateFallback = useCallback(() => {
    console.log('[FallbackHandler] Deactivating fallback');
    
    setFallbackStatus({
      active: false,
      reason: null,
      message: null,
      canRetry: false,
      retryAttempts: 0
    });

    // Show recovery notification
    showRecoveryNotification();
  }, []);

  /**
   * Attempt to retry voice connection
   */
  const retryVoiceConnection = useCallback(async (retryFn: () => Promise<boolean>) => {
    if (!fallbackStatus.canRetry) {
      return { success: false, reason: 'Retry not available' };
    }

    setIsRetrying(true);
    
    try {
      const success = await retryFn();
      
      if (success) {
        deactivateFallback();
        return { success: true };
      } else {
        setFallbackStatus(prev => ({
          ...prev,
          retryAttempts: prev.retryAttempts + 1
        }));
        return { success: false, reason: 'Voice service still unavailable' };
      }
    } catch (error) {
      console.error('[FallbackHandler] Retry failed:', error);
      setFallbackStatus(prev => ({
        ...prev,
        retryAttempts: prev.retryAttempts + 1
      }));
      return { success: false, error };
    } finally {
      setIsRetrying(false);
    }
  }, [fallbackStatus.canRetry, deactivateFallback]);

  /**
   * Handle voice errors
   */
  const handleVoiceError = useCallback((error: any) => {
    console.error('[FallbackHandler] Voice error:', error);

    // Categorize error
    const errorCategory = categorizeError(error);
    const { message, canRetry } = getErrorResponse(errorCategory);

    activateFallback(errorCategory, message, canRetry);
  }, [activateFallback]);

  return {
    fallbackStatus,
    isRetrying,
    activateFallback,
    deactivateFallback,
    retryVoiceConnection,
    handleVoiceError
  };
};

/**
 * Categorize error type
 */
function categorizeError(error: any): string {
  const errorStr = JSON.stringify(error).toUpperCase();

  if (errorStr.includes('MICROPHONE') || errorStr.includes('PERMISSION')) {
    return 'MICROPHONE_PERMISSION';
  }
  if (errorStr.includes('NETWORK') || errorStr.includes('TIMEOUT')) {
    return 'NETWORK';
  }
  if (errorStr.includes('API') || errorStr.includes('KEY')) {
    return 'API_KEY';
  }
  if (errorStr.includes('RATE_LIMIT') || errorStr.includes('QUOTA')) {
    return 'API_LIMIT';
  }

  return 'UNKNOWN';
}

/**
 * Get user-friendly error message
 */
function getErrorResponse(category: string): { message: string; canRetry: boolean } {
  const responses: Record<string, { message: string; canRetry: boolean }> = {
    MICROPHONE_PERMISSION: {
      message: "🎙️ Microphone access is needed for voice mode. Click 'Allow' in your browser, or let's continue with text!",
      canRetry: false
    },
    NETWORK: {
      message: "🔌 Connection interrupted. Switched to text mode. You can try voice again in a moment.",
      canRetry: true
    },
    API_KEY: {
      message: "🔑 Voice service needs configuration. Text mode is ready to go!",
      canRetry: false
    },
    API_LIMIT: {
      message: "⏸️ Voice service is taking a break. Let's chat via text for now!",
      canRetry: true
    },
    UNKNOWN: {
      message: "💬 Switched to text mode for a smoother experience.",
      canRetry: true
    }
  };

  return responses[category] || responses.UNKNOWN;
}

/**
 * Show fallback notification
 */
function showFallbackNotification(message: string) {
  // This would integrate with your notification system
  console.log(`[Notification] ${message}`);
  
  // Example: Could use toast notification library
  // toast.info(message, { duration: 5000 });
}

/**
 * Show recovery notification
 */
function showRecoveryNotification() {
  const message = "✅ Voice mode restored!";
  console.log(`[Notification] ${message}`);
  
  // Example: Could use toast notification library
  // toast.success(message, { duration: 3000 });
}

/**
 * Fallback UI Component
 */
export const FallbackBanner = ({ 
  status, 
  onRetry, 
  isRetrying 
}: { 
  status: FallbackStatus; 
  onRetry?: () => void;
  isRetrying?: boolean;
}) => {
  if (!status.active) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">{status.message}</p>
          {status.canRetry && onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-2 text-sm font-medium text-yellow-700 hover:text-yellow-600 underline disabled:opacity-50"
            >
              {isRetrying ? 'Retrying...' : 'Try Voice Again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Text Input Fallback Component
 */
export const TextInputFallback = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type your message..." 
}: { 
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </form>
  );
};

export default useFallbackHandler;
