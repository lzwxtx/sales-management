import { create } from 'zustand';
import { db } from '../db';

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
    },
    deleteProduct: async (id) => {
        set((state) => ({
            products: state.products.filter(p => p.id !== id)
        }));
        await db.products.delete(id);
    },
    updateStock: async (id, quantity) => {
        const product = get().products.find(p => p.id === id);
        if (product) {
            const newStock = product.stock + quantity;
            set((state) => ({
                products: state.products.map(p => p.id === id ? { ...p, stock: newStock } : p)
            }));
            await db.products.update(id, { stock: newStock });
        }
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
    },
    updatePartner: async (id, updates) => {
        set((state) => ({
            partners: state.partners.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
        await db.partners.update(id, updates);
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
                db.consignment_logs.add({
                    partnerId: order.partnerId,
                    type: 'SEND',
                    date: new Date().toISOString(),
                    items: order.items // Snapshot of items sent
                })
            ]);
        } else {
            set({
                consignments: state.consignments.map(c => c.id === id ? { ...c, status } : c)
            });
            await db.consignments.update(id, { status });
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
            db.consignment_logs.add({
                partnerId: targetConsignment.partnerId,
                type: 'SOLD',
                date: new Date().toISOString(),
                items: soldItems
            })
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
            db.consignment_logs.add({
                partnerId: targetConsignment.partnerId,
                type: 'RETURN',
                date: new Date().toISOString(),
                items: returnedItems
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
}));
