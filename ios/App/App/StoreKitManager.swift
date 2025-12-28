import StoreKit

@available(iOS 15.0, *)
@MainActor
class StoreKitManager: ObservableObject {
    static let shared = StoreKitManager()
    
    // Product IDs - must match App Store Connect exactly
    static let monthlyProductId = "mm_month"
    static let yearlyProductId = "mm_yearly"
    
    @Published private(set) var products: [Product] = []
    @Published private(set) var purchasedProductIDs: Set<String> = []
    @Published private(set) var isSubscribed: Bool = false
    @Published private(set) var subscriptionStatus: String = "none" // none, active, expired
    
    private var updateListenerTask: Task<Void, Error>? = nil
    private var productsLoaded = false
    
    init() {
        updateListenerTask = listenForTransactions()
        Task {
            await loadProducts()
            await updateSubscriptionStatus()
        }
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    // Listen for transactions
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try await self.checkVerified(result)
                    await self.updateSubscriptionStatus()
                    await transaction.finish()
                } catch {
                    print("[StoreKit] Transaction verification failed: \(error)")
                }
            }
        }
    }
    
    // Load products from App Store
    func loadProducts() async {
        if productsLoaded && !products.isEmpty {
            print("[StoreKit] Products already loaded: \(products.count)")
            return
        }
        
        do {
            let productIds = [StoreKitManager.monthlyProductId, StoreKitManager.yearlyProductId]
            print("[StoreKit] Requesting products: \(productIds)")
            
            products = try await Product.products(for: productIds)
            productsLoaded = true
            
            print("[StoreKit] Loaded \(products.count) products")
            for product in products {
                print("[StoreKit] Product: \(product.id) - \(product.displayPrice) - \(product.displayName)")
            }
            
            if products.isEmpty {
                print("[StoreKit] ⚠️ No products returned! Check:")
                print("[StoreKit] 1. Product IDs match App Store Connect exactly")
                print("[StoreKit] 2. Products are approved in App Store Connect")
                print("[StoreKit] 3. Bundle ID matches App Store Connect")
                print("[StoreKit] 4. Signed with correct provisioning profile")
            }
        } catch {
            print("[StoreKit] ❌ Failed to load products: \(error)")
            print("[StoreKit] Error details: \(error.localizedDescription)")
        }
    }
    
    // Purchase a product
    func purchase(_ productId: String) async throws -> Bool {
        // Ensure products are loaded
        if products.isEmpty {
            print("[StoreKit] Products not loaded, loading now...")
            await loadProducts()
        }
        
        print("[StoreKit] Attempting purchase for: \(productId)")
        print("[StoreKit] Available products: \(products.map { $0.id })")
        
        guard let product = products.first(where: { $0.id == productId }) else {
            print("[StoreKit] ❌ Product not found: \(productId)")
            throw StoreKitError.productNotFound
        }
        
        print("[StoreKit] Found product: \(product.displayName) - \(product.displayPrice)")
        
        let result = try await product.purchase()
        
        switch result {
        case .success(let verification):
            print("[StoreKit] ✅ Purchase successful, verifying...")
            let transaction = try checkVerified(verification)
            await updateSubscriptionStatus()
            await transaction.finish()
            print("[StoreKit] ✅ Purchase completed!")
            return true
            
        case .userCancelled:
            print("[StoreKit] User cancelled purchase")
            return false
            
        case .pending:
            print("[StoreKit] Purchase pending (Ask to Buy or similar)")
            return false
            
        @unknown default:
            print("[StoreKit] Unknown purchase result")
            return false
        }
    }
    
    // Restore purchases
    func restorePurchases() async throws {
        print("[StoreKit] Restoring purchases...")
        try await AppStore.sync()
        await updateSubscriptionStatus()
        print("[StoreKit] Restore complete. Subscribed: \(isSubscribed)")
    }
    
    // Update subscription status
    func updateSubscriptionStatus() async {
        var hasActiveSubscription = false
        
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)
                
                if transaction.productType == .autoRenewable {
                    purchasedProductIDs.insert(transaction.productID)
                    hasActiveSubscription = true
                    print("[StoreKit] Found active subscription: \(transaction.productID)")
                }
            } catch {
                print("[StoreKit] Failed to verify transaction: \(error)")
            }
        }
        
        isSubscribed = hasActiveSubscription
        subscriptionStatus = hasActiveSubscription ? "active" : "none"
    }
    
    // Get subscription info for syncing with backend
    func getSubscriptionInfo() async -> [String: Any]? {
        for await result in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(result)
                
                if transaction.productType == .autoRenewable {
                    return [
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
                        "expirationDate": transaction.expirationDate.map { ISO8601DateFormatter().string(from: $0) } ?? "",
                        "isSubscribed": true
                    ]
                }
            } catch {
                print("[StoreKit] Failed to verify transaction: \(error)")
            }
        }
        
        return nil
    }
    
    // Verify transaction
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitError.verificationFailed
        case .verified(let safe):
            return safe
        }
    }
}

// Custom errors
enum StoreKitError: Error, LocalizedError {
    case productNotFound
    case verificationFailed
    case purchaseFailed
    
    var errorDescription: String? {
        switch self {
        case .productNotFound:
            return "Product not found. Check product IDs match App Store Connect."
        case .verificationFailed:
            return "Transaction verification failed."
        case .purchaseFailed:
            return "Purchase failed."
        }
    }
}
