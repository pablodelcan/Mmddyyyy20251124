import Foundation
import Capacitor
import StoreKit

@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSubscriptionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSubscriptionInfo", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func getProducts(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task { @MainActor in
                await StoreKitManager.shared.loadProducts()
                
                let products = StoreKitManager.shared.products.map { product -> [String: Any] in
                    return [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": product.price.description,
                        "displayPrice": product.displayPrice,
                        "type": product.type.rawValue
                    ]
                }
                
                call.resolve(["products": products])
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }
    
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Product ID is required")
            return
        }
        
        if #available(iOS 15.0, *) {
            Task { @MainActor in
                do {
                    let success = try await StoreKitManager.shared.purchase(productId)
                    
                    if success {
                        let subscriptionInfo = await StoreKitManager.shared.getSubscriptionInfo()
                        call.resolve([
                            "success": true,
                            "subscriptionInfo": subscriptionInfo ?? [:]
                        ])
                    } else {
                        call.resolve(["success": false, "cancelled": true])
                    }
                } catch {
                    call.reject("Purchase failed: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task { @MainActor in
                do {
                    try await StoreKitManager.shared.restorePurchases()
                    let isSubscribed = StoreKitManager.shared.isSubscribed
                    let subscriptionInfo = await StoreKitManager.shared.getSubscriptionInfo()
                    
                    call.resolve([
                        "success": true,
                        "isSubscribed": isSubscribed,
                        "subscriptionInfo": subscriptionInfo ?? [:]
                    ])
                } catch {
                    call.reject("Restore failed: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }
    
    @objc func getSubscriptionStatus(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task { @MainActor in
                await StoreKitManager.shared.updateSubscriptionStatus()
                
                call.resolve([
                    "isSubscribed": StoreKitManager.shared.isSubscribed,
                    "status": StoreKitManager.shared.subscriptionStatus,
                    "purchasedProductIds": Array(StoreKitManager.shared.purchasedProductIDs)
                ])
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }
    
    @objc func getSubscriptionInfo(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task { @MainActor in
                let subscriptionInfo = await StoreKitManager.shared.getSubscriptionInfo()
                
                if let info = subscriptionInfo {
                    call.resolve(info as [String: Any])
                } else {
                    call.resolve(["isSubscribed": false])
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15+")
        }
    }
}
