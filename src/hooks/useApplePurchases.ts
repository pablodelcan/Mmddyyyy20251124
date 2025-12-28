import { useState, useEffect, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { projectId } from '../utils/supabase/info';

// Define the StoreKit plugin interface
interface StoreKitProduct {
    id: string;
    displayName: string;
    description: string;
    price: string;
    displayPrice: string;
    type: string;
}

interface SubscriptionInfo {
    productId?: string;
    transactionId?: string;
    originalTransactionId?: string;
    purchaseDate?: string;
    expirationDate?: string;
    isSubscribed: boolean;
}

interface StoreKitPluginInterface {
    getProducts(): Promise<{ products: StoreKitProduct[] }>;
    purchase(options: { productId: string }): Promise<{ success: boolean; cancelled?: boolean; subscriptionInfo?: SubscriptionInfo }>;
    restorePurchases(): Promise<{ success: boolean; isSubscribed: boolean; subscriptionInfo?: SubscriptionInfo }>;
    getSubscriptionStatus(): Promise<{ isSubscribed: boolean; status: string; purchasedProductIds: string[] }>;
    getSubscriptionInfo(): Promise<SubscriptionInfo>;
}

// Register the native plugin
const StoreKit = registerPlugin<StoreKitPluginInterface>('StoreKit');

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1`;

export function useApplePurchases(accessToken: string | null) {
    const [products, setProducts] = useState<StoreKitProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);
    const [isAppleSubscribed, setIsAppleSubscribed] = useState(false);

    // Check if we're on iOS native
    const isIOSNative = Capacitor.getPlatform() === 'ios';

    // Load products on mount
    useEffect(() => {
        if (!isIOSNative) {
            setIsLoading(false);
            return;
        }

        const loadProducts = async () => {
            try {
                const result = await StoreKit.getProducts();
                setProducts(result.products);

                // Also check subscription status
                const status = await StoreKit.getSubscriptionStatus();
                setIsAppleSubscribed(status.isSubscribed);
                setIsPro(status.isSubscribed);
            } catch (error) {
                console.error('Failed to load products:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProducts();
    }, [isIOSNative]);

    // Purchase a product
    const purchase = useCallback(async (productId: string): Promise<boolean> => {
        if (!isIOSNative) return false;

        try {
            const result = await StoreKit.purchase({ productId });

            if (result.success && result.subscriptionInfo) {
                // Sync with backend
                await syncSubscriptionWithBackend(result.subscriptionInfo);
                setIsAppleSubscribed(true);
                setIsPro(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Purchase failed:', error);
            return false;
        }
    }, [isIOSNative, accessToken]);

    // Restore purchases
    const restorePurchases = useCallback(async (): Promise<boolean> => {
        if (!isIOSNative) return false;

        try {
            const result = await StoreKit.restorePurchases();

            if (result.isSubscribed && result.subscriptionInfo) {
                await syncSubscriptionWithBackend(result.subscriptionInfo);
                setIsAppleSubscribed(true);
                setIsPro(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Restore failed:', error);
            return false;
        }
    }, [isIOSNative, accessToken]);

    // Sync subscription with backend
    const syncSubscriptionWithBackend = async (subscriptionInfo: SubscriptionInfo) => {
        if (!accessToken) return;

        try {
            await fetch(`${SERVER_URL}/make-server-d6a7a206/sync-apple-subscription`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscriptionInfo),
            });
        } catch (error) {
            console.error('Failed to sync with backend:', error);
        }
    };

    // Check subscription status
    const checkSubscription = useCallback(async () => {
        if (!isIOSNative) return;

        try {
            const status = await StoreKit.getSubscriptionStatus();
            setIsAppleSubscribed(status.isSubscribed);
            setIsPro(status.isSubscribed);

            if (status.isSubscribed) {
                const info = await StoreKit.getSubscriptionInfo();
                if (info.isSubscribed) {
                    await syncSubscriptionWithBackend(info);
                }
            }
        } catch (error) {
            console.error('Failed to check subscription:', error);
        }
    }, [isIOSNative, accessToken]);

    // Get product by ID
    const getProduct = useCallback((productId: string): StoreKitProduct | undefined => {
        return products.find(p => p.id === productId);
    }, [products]);

    return {
        isIOSNative,
        products,
        isLoading,
        isPro,
        isAppleSubscribed,
        purchase,
        restorePurchases,
        checkSubscription,
        getProduct,
        monthlyProduct: getProduct('mm_month'),
        yearlyProduct: getProduct('mm_yearly'),
    };
}
