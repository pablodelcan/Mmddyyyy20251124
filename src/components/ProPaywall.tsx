import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface ProPaywallProps {
    isOpen: boolean;
    onClose: () => void;
    onStartTrial: (priceType: 'monthly' | 'yearly') => Promise<void>;
    onApplePurchase?: (productId: string) => Promise<boolean>;
    onRestorePurchases?: () => Promise<boolean>;
    timeOfDay?: 'day' | 'night';
}

export function ProPaywall({
    isOpen,
    onClose,
    onStartTrial,
    onApplePurchase,
    onRestorePurchases,
    timeOfDay = 'day'
}: ProPaywallProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

    // Check if we're on iOS native
    const isIOSNative = Capacitor.getPlatform() === 'ios';

    const handleStartTrial = async () => {
        setIsLoading(true);
        try {
            if (isIOSNative && onApplePurchase) {
                // Use Apple IAP on iOS
                const productId = selectedPlan === 'monthly' ? 'mm_month' : 'mm_yearly';
                const success = await onApplePurchase(productId);
                if (success) {
                    onClose();
                }
            } else {
                // Use Stripe on web
                await onStartTrial(selectedPlan);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!onRestorePurchases) return;

        setIsRestoring(true);
        try {
            const success = await onRestorePurchases();
            if (success) {
                onClose();
            }
        } finally {
            setIsRestoring(false);
        }
    };

    // Colors based on time of day
    const colors = {
        background: timeOfDay === 'night' ? '#1D1C1C' : '#FBF8E8',
        text: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
        textMuted: timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.6)' : 'rgba(0, 0, 0, 0.6)',
        border: timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        buttonBg: timeOfDay === 'night' ? '#FBF8E8' : '#000000',
        buttonText: timeOfDay === 'night' ? '#1D1C1C' : '#FBF8E8',
        buttonOutlineBg: 'transparent',
        buttonOutlineBorder: timeOfDay === 'night' ? 'rgba(251, 248, 232, 0.3)' : 'rgba(0, 0, 0, 0.3)',
        overlay: timeOfDay === 'night' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
    };

    const features = [
        'Resolutions 2026',
        'Add notes to Life in weeks',
        'Weekly email summaries',
        ...(isIOSNative ? ['Drawing'] : []),
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.overlay,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999,
                        padding: '20px',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            width: '100%',
                            maxWidth: '320px',
                            backgroundColor: colors.background,
                            borderRadius: '8px',
                            padding: '24px',
                            position: 'relative',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            <X style={{ width: '16px', height: '16px', color: colors.text }} />
                        </button>

                        {/* Header */}
                        <h2
                            style={{
                                fontFamily: 'Courier New, monospace',
                                fontWeight: 700,
                                fontSize: '18px',
                                lineHeight: '1.4',
                                color: colors.text,
                                margin: '0 0 4px 0',
                            }}
                        >
                            Upgrade to Pro
                        </h2>
                        <p
                            style={{
                                fontFamily: 'Courier New, monospace',
                                fontWeight: 700,
                                fontSize: '14px',
                                lineHeight: '1.4',
                                color: colors.textMuted,
                                margin: '0 0 24px 0',
                            }}
                        >
                            {isIOSNative ? 'Unlock all features' : '3 months free'}
                        </p>

                        {/* Features */}
                        <div style={{ marginBottom: '24px' }}>
                            <p
                                style={{
                                    fontFamily: 'Courier New, monospace',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                    color: colors.text,
                                    margin: '0 0 12px 0',
                                }}
                            >
                                Pro includes:
                            </p>
                            <ul
                                style={{
                                    listStyle: 'disc',
                                    paddingLeft: '20px',
                                    margin: 0,
                                }}
                            >
                                {features.map((feature, index) => (
                                    <li
                                        key={index}
                                        style={{
                                            fontFamily: 'Courier New, monospace',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            lineHeight: '1.8',
                                            color: colors.text,
                                        }}
                                    >
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pricing */}
                        <div style={{ marginBottom: '24px' }}>
                            <p
                                style={{
                                    fontFamily: 'Courier New, monospace',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                    color: colors.text,
                                    margin: '0 0 8px 0',
                                }}
                            >
                                {isIOSNative ? 'Choose plan:' : 'After trial:'}
                            </p>

                            {/* Plan Selection */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={() => setSelectedPlan('monthly')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '4px 0',
                                        cursor: 'pointer',
                                        fontFamily: 'Courier New, monospace',
                                        fontSize: '14px',
                                        color: colors.text,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            border: `2px solid ${selectedPlan === 'monthly' ? colors.text : colors.border}`,
                                            backgroundColor: selectedPlan === 'monthly' ? colors.text : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {selectedPlan === 'monthly' && (
                                            <span
                                                style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: colors.background,
                                                }}
                                            />
                                        )}
                                    </span>
                                    $1/month
                                </button>

                                <button
                                    onClick={() => setSelectedPlan('yearly')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '4px 0',
                                        cursor: 'pointer',
                                        fontFamily: 'Courier New, monospace',
                                        fontSize: '14px',
                                        color: colors.text,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            border: `2px solid ${selectedPlan === 'yearly' ? colors.text : colors.border}`,
                                            backgroundColor: selectedPlan === 'yearly' ? colors.text : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {selectedPlan === 'yearly' && (
                                            <span
                                                style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: colors.background,
                                                }}
                                            />
                                        )}
                                    </span>
                                    or $10/year
                                </button>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleStartTrial}
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    backgroundColor: colors.buttonBg,
                                    color: colors.buttonText,
                                    border: 'none',
                                    borderRadius: '24px',
                                    fontFamily: 'Courier New, monospace',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: isLoading ? 'wait' : 'pointer',
                                    opacity: isLoading ? 0.7 : 1,
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                {isLoading ? 'Loading...' : (isIOSNative ? 'Subscribe Now' : 'Start 3-Month Trial')}
                            </button>

                            {/* Restore Purchases - only on iOS */}
                            {isIOSNative && onRestorePurchases && (
                                <button
                                    onClick={handleRestore}
                                    disabled={isRestoring}
                                    style={{
                                        width: '100%',
                                        height: '48px',
                                        backgroundColor: colors.buttonOutlineBg,
                                        color: colors.text,
                                        border: `1px solid ${colors.buttonOutlineBorder}`,
                                        borderRadius: '24px',
                                        fontFamily: 'Courier New, monospace',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: isRestoring ? 'wait' : 'pointer',
                                        opacity: isRestoring ? 0.7 : 1,
                                    }}
                                >
                                    {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    backgroundColor: colors.buttonOutlineBg,
                                    color: colors.text,
                                    border: `1px solid ${colors.buttonOutlineBorder}`,
                                    borderRadius: '24px',
                                    fontFamily: 'Courier New, monospace',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                }}
                            >
                                Maybe Later
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
