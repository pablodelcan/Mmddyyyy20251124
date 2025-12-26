import { useState, useEffect, useCallback } from 'react';
import { projectId } from '../utils/supabase/info';

interface SubscriptionData {
    stripeCustomerId: string | null;
    subscriptionId: string | null;
    status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete' | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    priceId: string | null;
}

interface UseSubscriptionReturn {
    isPro: boolean;
    isLoading: boolean;
    isTrialing: boolean;
    trialDaysRemaining: number | null;
    subscriptionData: SubscriptionData | null;
    checkAccess: () => boolean;
    refresh: () => Promise<void>;
    createCheckoutSession: (priceType: 'monthly' | 'yearly') => Promise<string | null>;
    createPortalSession: () => Promise<string | null>;
}

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1`;

export function useSubscription(accessToken: string | null): UseSubscriptionReturn {
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSubscriptionStatus = useCallback(async () => {
        if (!accessToken) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/make-server-d6a7a206/subscription-status`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSubscriptionData(data);
            }
        } catch (error) {
            console.error('Error fetching subscription status:', error);
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchSubscriptionStatus();
    }, [fetchSubscriptionStatus]);

    const isPro = subscriptionData?.status === 'active' || subscriptionData?.status === 'trialing';
    const isTrialing = subscriptionData?.status === 'trialing';

    const trialDaysRemaining = isTrialing && subscriptionData?.trialEnd
        ? Math.max(0, Math.ceil((new Date(subscriptionData.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const checkAccess = useCallback(() => {
        return isPro;
    }, [isPro]);

    const createCheckoutSession = useCallback(async (priceType: 'monthly' | 'yearly'): Promise<string | null> => {
        if (!accessToken) return null;

        try {
            const response = await fetch(`${SERVER_URL}/make-server-d6a7a206/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ priceType }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        }
        return null;
    }, [accessToken]);

    const createPortalSession = useCallback(async (): Promise<string | null> => {
        if (!accessToken) return null;

        try {
            const response = await fetch(`${SERVER_URL}/make-server-d6a7a206/create-portal-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                return data.url;
            }
        } catch (error) {
            console.error('Error creating portal session:', error);
        }
        return null;
    }, [accessToken]);

    return {
        isPro,
        isLoading,
        isTrialing,
        trialDaysRemaining,
        subscriptionData,
        checkAccess,
        refresh: fetchSubscriptionStatus,
        createCheckoutSession,
        createPortalSession,
    };
}
