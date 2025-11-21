// Voice Navigation Hook
import { useEffect, useRef, useState } from 'react'

export function useVoiceNavigation() {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

    useEffect(() => {
        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported in this browser')
            return
        }

        // Create utterance instance
        utteranceRef.current = new SpeechSynthesisUtterance()
        utteranceRef.current.rate = 0.9 // Slightly slower for clarity
        utteranceRef.current.pitch = 1
        utteranceRef.current.volume = 1

        utteranceRef.current.onstart = () => setIsSpeaking(true)
        utteranceRef.current.onend = () => setIsSpeaking(false)
        utteranceRef.current.onerror = () => setIsSpeaking(false)

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    const speak = (text: string) => {
        if (!isEnabled || !utteranceRef.current) return

        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        utteranceRef.current.text = text
        window.speechSynthesis.speak(utteranceRef.current)
    }

    const stop = () => {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
    }

    const toggle = () => {
        setIsEnabled(!isEnabled)
        if (isEnabled) {
            stop()
        }
    }

    return {
        speak,
        stop,
        toggle,
        isSpeaking,
        isEnabled,
        setIsEnabled
    }
}
