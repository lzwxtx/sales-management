import { create } from 'zustand';
import { db } from '../db';
import { syncManager } from '../utils/syncManager';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useStore = create((set, get) => ({
    // --- Initial Load ---
    isLoaded: false,
    init: async () => {
        if (get().isLoaded) return;
        const [products, partners, consignments, sales] = await Promise.all([
            db.products.toArray(),
            db.partners.toArray(),
            db.consignments.toArray(),
            db.sales.toArray(),
        ]);
        set({ products, partners, consignments, sales, isLoaded: true });

        // 初始化跨标签页同步
        syncManager.init(({ action, data }) => {
            get().syncFromExternal(action, data);
        });
    },

    // --- Products Slice ---
    products: [],
    addProduct: async (product) => {
        const id = generateId();
        let imageUrl = product.imageUrl;

        // Handle Image Upload
        if (product.imageFile) {
            const imageId = `img_${id}`;
            await db.images.put({ id: imageId, blob: product.imageFile });
            imageUrl = `local:${imageId}`;
        }

        const newProduct = {
            ...product,
            id,
            imageUrl,
            stock: Number(product.stock) || 0,
            createAt: new Date().toISOString()
        };
        delete newProduct.imageFile;

        // 1. Optimistic Update
        set((state) => ({ products: [...state.products, newProduct] }));
        // 2. Persist
        await db.products.add(newProduct);
        // 3. Broadcast to other tabs
        syncManager.broadcast('ADD_PRODUCT', newProduct);
    },
    updateProduct: async (id, updates) => {
        let finalUpdates = { ...updates };

        // Handle Image Upload
        if (updates.imageFile) {
            const imageId = `img_${id}`;
            await db.images.put({ id: imageId, blob: updates.imageFile });
            finalUpdates.imageUrl = `local:${imageId}`;
            delete finalUpdates.imageFile;
        }

        set((state) => ({
            products: state.products.map(p => p.id === id ? { ...p, ...finalUpdates } : p)
        }));
        await db.products.update(id, finalUpdates);
        syncManager.broadcast('UPDATE_PRODUCT', { id, updates: finalUpdates });
    },
    addStockAdjustment: async (adjustment) => {
        const { productId, type, reason, quantity, note } = adjustment;
        const state = get();
        const product = state.products.find(p => p.id === productId);

        if (!product) {
            throw new Error('商品不存在');
        }

        // 计算新库存
        const delta = type === 'IN' ? quantity : -quantity;
        const newStock = product.stock + delta;

        if (newStock < 0) {
            throw new Error('库存不足，无法出库');
        }

        // 创建调整记录
        const record = {
            productId,
            type,
            reason,
            quantity: Number(quantity),
            note: note || '',
            date: new Date().toISOString()
        };

        // 更新状态
        set({
            products: state.products.map(p =>
                p.id === productId ? { ...p, stock: newStock } : p
            )
        });

        // 持久化
        await Promise.all([
            db.products.update(productId, { stock: newStock }),
            db.inventory_logs.add({
                type: type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                date: new Date().toISOString(),
                partnerId: null,
                productId,
                items: [{
                    productId,
                    quantity: Number(quantity)
                }],
                reason,
                note: note || ''
            })
        ]);

        // 广播库存变更
        syncManager.broadcast('STOCK_ADJUSTMENT', { productId, newStock });
    },


    // --- Partners Slice ---
    partners: [],
    addPartner: async (partner) => {
        const id = generateId();
        const newPartner = { ...partner, id, createAt: new Date().toISOString() };
        set((state) => ({
            partners: [...state.partners, newPartner]
        }));
        await db.partners.add(newPartner);
        syncManager.broadcast('ADD_PARTNER', newPartner);
    },
    updatePartner: async (id, updates) => {
        set((state) => ({
            partners: state.partners.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
        await db.partners.update(id, updates);
        syncManager.broadcast('UPDATE_PARTNER', { id, updates });
    },

    // --- Consignment Slice ---
    consignments: [],
    addConsignment: async (data) => {
        const id = generateId();
        const newOrder = {
            ...data,
            id,
            status: 'DRAFT',
            createAt: new Date().toISOString(),
            soldItems: [],
            returnedItems: []
        };
        set((state) => ({
            consignments: [...state.consignments, newOrder]
        }));
        await db.consignments.add(newOrder);
        syncManager.broadcast('ADD_CONSIGNMENT', newOrder);
    },
    updateConsignmentStatus: async (id, status) => {
        const state = get();
        const order = state.consignments.find(c => c.id === id);
        if (!order) return;

        // Logic for stock deduction when confirming
        if (status === 'CONFIRMED' && order.status === 'DRAFT') {
            const newProducts = [...state.products];
            // DB Transaction for atomicity could be used here, but keeping it simple for now
            const productUpdates = [];

            order.items.forEach(item => {
                const prodIndex = newProducts.findIndex(p => p.id === item.productId);
                if (prodIndex > -1) {
                    const newStock = newProducts[prodIndex].stock - item.quantity;
                    newProducts[prodIndex] = { ...newProducts[prodIndex], stock: newStock };
                    productUpdates.push(db.products.update(item.productId, { stock: newStock }));
                }
            });

            set({
                consignments: state.consignments.map(c => c.id === id ? { ...c, status } : c),
                products: newProducts
            });

            await Promise.all([
                db.consignments.update(id, { status }),
                ...productUpdates,
                // Log SEND
                db.inventory_logs.add({
                    type: 'SEND',
                    date: new Date().toISOString(),
                    partnerId: order.partnerId,
                    items: order.items,
                    productId: null,
                    reason: null,
                    note: null
                })
            ]);
            syncManager.broadcast('UPDATE_CONSIGNMENT_STATUS', { id, status });
        } else {
            set({
                consignments: state.consignments.map(c => c.id === id ? { ...c, status } : c)
            });
            await db.consignments.update(id, { status });
            syncManager.broadcast('UPDATE_CONSIGNMENT_STATUS', { id, status });
        }
    },

    // Register Consignment Sale (Partner sold items, we get money)
    registerConsignmentSale: async (consignmentId, soldItems) => {
        const state = get();
        // soldItems: [{ productId, quantity, price }]
        // 1. Create Sales Record
        const salesRecord = {
            id: generateId(),
            date: new Date().toISOString(),
            type: 'CONSIGNMENT',
            relatedConsignmentId: consignmentId,
            items: soldItems,
            totalAmount: soldItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        };

        // 2. Update Consignment "soldItems"
        const newConsignments = state.consignments.map(c => {
            if (c.id === consignmentId) {
                const currentSold = [...(c.soldItems || [])];
                soldItems.forEach(newItem => {
                    const exist = currentSold.find(x => x.productId === newItem.productId);
                    if (exist) exist.quantity += newItem.quantity;
                    else currentSold.push({ productId: newItem.productId, quantity: newItem.quantity });
                });
                return { ...c, soldItems: currentSold };
            }
            return c;
        });

        // 3. Apply updates
        set({
            sales: [...state.sales, salesRecord],
            consignments: newConsignments
        });

        const targetConsignment = newConsignments.find(c => c.id === consignmentId);
        await Promise.all([
            db.sales.add(salesRecord),
            db.consignments.update(consignmentId, { soldItems: targetConsignment.soldItems }),
            // Log SOLD
            db.inventory_logs.add({
                type: 'SOLD',
                date: new Date().toISOString(),
                partnerId: targetConsignment.partnerId,
                items: soldItems,
                productId: null,
                reason: null,
                note: null
            })
        ]);
    },

    // Merge multiple consignments for the same partner
    mergeConsignments: async (targetId, sourceIds) => {
        const state = get();
        const targetOrder = state.consignments.find(c => c.id === targetId);
        if (!targetOrder) return;

        // Get all source consignments to merge
        const sourceOrders = sourceIds.map(id =>
            state.consignments.find(c => c.id === id)
        ).filter(Boolean);

        if (sourceOrders.length === 0) return;

        // Merge items list
        const mergedItems = [...targetOrder.items];
        const mergedSoldItems = [...(targetOrder.soldItems || [])];
        const mergedReturnedItems = [...(targetOrder.returnedItems || [])];

        sourceOrders.forEach(source => {
            // Merge items
            source.items.forEach(newItem => {
                const existing = mergedItems.find(i => i.productId === newItem.productId);
                if (existing) {
                    existing.quantity += newItem.quantity;
                } else {
                    mergedItems.push({ ...newItem });
                }
            });

            // Merge soldItems
            if (source.soldItems) {
                source.soldItems.forEach(soldItem => {
                    const existing = mergedSoldItems.find(i => i.productId === soldItem.productId);
                    if (existing) {
                        existing.quantity += soldItem.quantity;
                    } else {
                        mergedSoldItems.push({ ...soldItem });
                    }
                });
            }

            // Merge returnedItems
            if (source.returnedItems) {
                source.returnedItems.forEach(returnedItem => {
                    const existing = mergedReturnedItems.find(i => i.productId === returnedItem.productId);
                    if (existing) {
                        existing.quantity += returnedItem.quantity;
                    } else {
                        mergedReturnedItems.push({ ...returnedItem });
                    }
                });
            }
        });

        // Recalculate total value
        const totalValue = mergedItems.reduce((sum, item) =>
            sum + (item.quantity * item.unitPrice), 0
        );

        // Update state - remove source consignments, update target
        set({
            consignments: state.consignments
                .filter(c => !sourceIds.includes(c.id))
                .map(c => c.id === targetId ? {
                    ...c,
                    items: mergedItems,
                    soldItems: mergedSoldItems,
                    returnedItems: mergedReturnedItems,
                    totalValue
                } : c)
        });

        // Persist to database
        await Promise.all([
            db.consignments.update(targetId, {
                items: mergedItems,
                soldItems: mergedSoldItems,
                returnedItems: mergedReturnedItems,
                totalValue
            }),
            ...sourceIds.map(id => db.consignments.delete(id))
        ]);
    },

    // Return items from consignment (Partner returns unsold goods)
    returnConsignmentItems: async (consignmentId, returnedItems) => {
        const state = get();

        // 1. Update Products Stock (Increase)
        const newProducts = [...state.products];
        const productUpdates = [];

        returnedItems.forEach(item => {
            const prodIndex = newProducts.findIndex(p => p.id === item.productId);
            if (prodIndex > -1) {
                const newStock = newProducts[prodIndex].stock + Number(item.quantity);
                newProducts[prodIndex] = { ...newProducts[prodIndex], stock: newStock };
                productUpdates.push(db.products.update(item.productId, { stock: newStock }));
            }
        });

        // 2. Update Consignment "returnedItems"
        const newConsignments = state.consignments.map(c => {
            if (c.id === consignmentId) {
                const currentReturned = [...(c.returnedItems || [])];
                returnedItems.forEach(newItem => {
                    const exist = currentReturned.find(x => x.productId === newItem.productId);
                    if (exist) exist.quantity += Number(newItem.quantity);
                    else currentReturned.push({ productId: newItem.productId, quantity: Number(newItem.quantity) });
                });
                return { ...c, returnedItems: currentReturned };
            }
            return c;
        });

        set({
            products: newProducts,
            consignments: newConsignments
        });

        const targetConsignment = newConsignments.find(c => c.id === consignmentId);
        await Promise.all([
            ...productUpdates,
            db.consignments.update(consignmentId, { returnedItems: targetConsignment.returnedItems }),
            // Log RETURN
            db.inventory_logs.add({
                type: 'RETURN',
                date: new Date().toISOString(),
                partnerId: targetConsignment.partnerId,
                items: returnedItems,
                productId: null,
                reason: null,
                note: null
            })
        ]);
    },

    // --- Sales Slice (Direct) ---
    sales: [],
    addSale: async (sale) => {
        const state = get();
        const salesRecord = { ...sale, id: generateId(), date: new Date().toISOString() };

        // Direct sale deduction
        if (sale.type === 'DIRECT') {
            const newProducts = [...state.products];
            const productUpdates = [];

            sale.items.forEach(item => {
                const prodIndex = newProducts.findIndex(p => p.id === item.productId);
                if (prodIndex > -1) {
                    const newStock = newProducts[prodIndex].stock - item.quantity;
                    newProducts[prodIndex] = { ...newProducts[prodIndex], stock: newStock };
                    productUpdates.push(db.products.update(item.productId, { stock: newStock }));
                }
            });

            set({
                sales: [...state.sales, salesRecord],
                products: newProducts
            });
            await Promise.all([
                db.sales.add(salesRecord),
                ...productUpdates
            ]);
        } else {
            set({ sales: [...state.sales, salesRecord] });
            await db.sales.add(salesRecord);
        }
    },

    // --- 跨标签页同步处理 ---
    syncFromExternal: (action, data) => {
        const state = get();

        switch (action) {
            case 'ADD_PRODUCT':
                // 检查是否已存在(避免重复)
                if (!state.products.find(p => p.id === data.id)) {
                    set({ products: [...state.products, data] });
                }
                break;

            case 'UPDATE_PRODUCT':
                set({
                    products: state.products.map(p =>
                        p.id === data.id ? { ...p, ...data.updates } : p
                    )
                });
                break;

            case 'ADD_PARTNER':
                if (!state.partners.find(p => p.id === data.id)) {
                    set({ partners: [...state.partners, data] });
                }
                break;

            case 'UPDATE_PARTNER':
                set({
                    partners: state.partners.map(p =>
                        p.id === data.id ? { ...p, ...data.updates } : p
                    )
                });
                break;

            case 'ADD_CONSIGNMENT':
                if (!state.consignments.find(c => c.id === data.id)) {
                    set({ consignments: [...state.consignments, data] });
                }
                break;

            case 'UPDATE_CONSIGNMENT_STATUS':
                set({
                    consignments: state.consignments.map(c =>
                        c.id === data.id ? { ...c, status: data.status } : c
                    )
                });
                break;

            case 'UPDATE_CONSIGNMENT':
                set({
                    consignments: state.consignments.map(c =>
                        c.id === data.id ? { ...c, ...data.updates } : c
                    )
                });
                break;

            case 'DELETE_CONSIGNMENT':
                set({
                    consignments: state.consignments.filter(c => c.id !== data.id)
                });
                break;

            case 'ADD_SALE':
                if (!state.sales.find(s => s.id === data.id)) {
                    set({ sales: [...state.sales, data] });
                }
                break;

            case 'STOCK_ADJUSTMENT':
                // 更新产品库存
                set({
                    products: state.products.map(p =>
                        p.id === data.productId ? { ...p, stock: data.newStock } : p
                    )
                });
                break;

            case 'RELOAD_ALL':
                // 完全重新加载所有数据
                get().init();
                break;

            default:
                console.warn('[SyncManager] 未知的同步操作:', action);
        }
    },
}));
