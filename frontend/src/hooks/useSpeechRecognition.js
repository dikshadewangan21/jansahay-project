/**
 * useSpeechRecognition hook
 *
 * Wraps the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Supports Hindi (hi-IN) and English (en-IN).
 *
 * Usage:
 *   const { listen, stop, transcript, isListening, isSupported, error } = useSpeechRecognition();
 *
 * Call listen(lang?) to start, stop() to abort.
 * The hook resolves the transcript via the onResult callback you pass.
 */

import { useState, useRef, useCallback } from 'react';

/**
 * @param {object} options
 * @param {(text: string) => void} options.onResult  - called with final transcript
 * @param {(err: string) => void}  [options.onError]  - called on error
 */
export function useSpeechRecognition({ onResult, onError } = {}) {
  const [isListening,  setIsListening]  = useState(false);
  const [transcript,   setTranscript]   = useState('');
  const [error,        setError]        = useState(null);
  const recognitionRef = useRef(null);

  // Check browser support once
  const SpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const isSupported = Boolean(SpeechRecognition);

  /**
   * Start listening.
   * @param {'hi-IN' | 'en-IN'} lang  defaults to 'hi-IN'
   */
  const listen = useCallback((lang = 'hi-IN') => {
    if (!SpeechRecognition) {
      const msg = 'Speech recognition is not supported in this browser. Please try Chrome or Edge.';
      setError(msg);
      onError?.(msg);
      return;
    }

    // Stop any existing session first
    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang            = lang;
    recognition.interimResults  = true;  // show live partial results
    recognition.maxAlternatives = 1;
    recognition.continuous      = false; // stop after first utterance

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Show interim text live, but only fire onResult for final
      const display = finalText || interimText;
      setTranscript(display);
      if (finalText) onResult?.(finalText.trim());
    };

    recognition.onerror = (event) => {
      const messages = {
        'no-speech':          'No speech detected. Please try again.',
        'audio-capture':      'Microphone not found or permission denied.',
        'not-allowed':        'Microphone permission denied. Please allow access in browser settings.',
        'network':            'Network error during speech recognition.',
        'aborted':            '',                      // user-initiated, not an error
        'language-not-supported': 'Selected language is not supported.',
      };
      const msg = messages[event.error] || `Speech error: ${event.error}`;
      if (msg) {
        setError(msg);
        onError?.(msg);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (err) {
      setError('Could not start microphone. Please check permissions.');
      setIsListening(false);
    }
  }, [SpeechRecognition, onResult, onError]);

  /**
   * Stop / abort the current session.
   */
  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  return { listen, stop, transcript, isListening, isSupported, error };
}
