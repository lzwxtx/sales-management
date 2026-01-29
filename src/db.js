import Dexie from 'dexie';

// 使用统一的数据库名称,确保所有端口共享同一个 IndexedDB
// 这样 localhost:5173 和 localhost:5174 会访问相同的数据
export const db = new Dexie('salesDB_unified');

db.version(3).stores({
    products: 'id, sku, name, category, stock',
    partners: 'id, name, contact',
    consignments: 'id, partnerId, status, createAt',
    sales: 'id, date, type',
    images: 'id',
    inventory_logs: '++id, type, date, partnerId, productId',
    consignment_logs: null, // 删除旧表
    stock_adjustments: null  // 删除旧表
}).upgrade(async tx => {
    // 数据迁移：从旧表迁移到新表
    try {
        // 迁移寄售记录
        const oldConsignmentLogs = await tx.table('consignment_logs').toArray();
        for (const log of oldConsignmentLogs) {
            await tx.table('inventory_logs').add({
                type: log.type, // SEND, SOLD, RETURN
                date: log.date,
                partnerId: log.partnerId,
                items: log.items,
                productId: null,
                reason: null,
                note: null
            });
        }

        // 迁移库存调整记录
        const oldStockAdjustments = await tx.table('stock_adjustments').toArray();
        for (const adj of oldStockAdjustments) {
            await tx.table('inventory_logs').add({
                type: adj.type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                date: adj.date,
                partnerId: null,
                productId: adj.productId,
                items: [{
                    productId: adj.productId,
                    quantity: adj.quantity
                }],
                reason: adj.reason,
                note: adj.note || ''
            });
        }
    } catch (error) {
        console.log('数据迁移完成或表不存在:', error.message);
    }
});

