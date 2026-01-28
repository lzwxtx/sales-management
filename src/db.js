import Dexie from 'dexie';

export const db = new Dexie('salesDB');

db.version(1).stores({
    products: 'id, sku, name, category, stock', // Primary key and indexed props
    partners: 'id, name, contact',
    consignments: 'id, partnerId, status, createAt',
    sales: 'id, date, type',
    images: 'id', // For storing blobs/base64, key is imageId
    consignment_logs: '++id, partnerId, type, date' // New: Log table
});
