import { db } from '../db';

/**
 * 数据备份和恢复工具
 * 用于在升级到后端服务时保护本地数据
 */

/**
 * 导出所有数据到 JSON 文件
 * @returns {Promise<string>} 返回 JSON 字符串
 */
export async function exportAllData() {
    try {
        const data = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            products: await db.products.toArray(),
            partners: await db.partners.toArray(),
            consignments: await db.consignments.toArray(),
            sales: await db.sales.toArray(),
            inventory_logs: await db.inventory_logs.toArray(),
            // 注意: images 表包含 Blob,需要特殊处理
            images: await exportImages()
        };

        console.log('[DataBackup] 数据导出成功:', {
            products: data.products.length,
            partners: data.partners.length,
            consignments: data.consignments.length,
            sales: data.sales.length,
            inventory_logs: data.inventory_logs.length,
            images: data.images.length
        });

        return JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('[DataBackup] 数据导出失败:', error);
        throw error;
    }
}

/**
 * 导出图片数据(转换为 Base64)
 */
async function exportImages() {
    const images = await db.images.toArray();
    const result = [];

    for (const img of images) {
        try {
            const base64 = await blobToBase64(img.blob);
            result.push({
                id: img.id,
                data: base64,
                type: img.blob.type
            });
        } catch (error) {
            console.error(`[DataBackup] 图片 ${img.id} 转换失败:`, error);
        }
    }

    return result;
}

/**
 * Blob 转 Base64
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 下载数据备份文件
 */
export async function downloadBackup() {
    try {
        const jsonData = await exportAllData();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('[DataBackup] 备份文件已下载');
        return true;
    } catch (error) {
        console.error('[DataBackup] 下载备份失败:', error);
        throw error;
    }
}

/**
 * 从 JSON 数据恢复
 * @param {string} jsonData - JSON 字符串
 */
export async function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);

        console.log('[DataBackup] 开始导入数据...');

        // 清空现有数据(可选,根据需求决定)
        // await db.products.clear();
        // await db.partners.clear();
        // ...

        // 导入数据
        if (data.products?.length) {
            await db.products.bulkPut(data.products);
        }
        if (data.partners?.length) {
            await db.partners.bulkPut(data.partners);
        }
        if (data.consignments?.length) {
            await db.consignments.bulkPut(data.consignments);
        }
        if (data.sales?.length) {
            await db.sales.bulkPut(data.sales);
        }
        if (data.inventory_logs?.length) {
            await db.inventory_logs.bulkPut(data.inventory_logs);
        }

        // 导入图片
        if (data.images?.length) {
            await importImages(data.images);
        }

        console.log('[DataBackup] 数据导入成功');
        return true;
    } catch (error) {
        console.error('[DataBackup] 数据导入失败:', error);
        throw error;
    }
}

/**
 * 导入图片数据(Base64 转 Blob)
 */
async function importImages(images) {
    for (const img of images) {
        try {
            const blob = await base64ToBlob(img.data, img.type);
            await db.images.put({ id: img.id, blob });
        } catch (error) {
            console.error(`[DataBackup] 图片 ${img.id} 导入失败:`, error);
        }
    }
}

/**
 * Base64 转 Blob
 */
async function base64ToBlob(base64, type) {
    const response = await fetch(base64);
    return await response.blob();
}

/**
 * 自动备份(定期执行)
 */
export function setupAutoBackup(intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    const backup = async () => {
        try {
            const jsonData = await exportAllData();
            localStorage.setItem('sales_auto_backup', jsonData);
            localStorage.setItem('sales_auto_backup_time', new Date().toISOString());
            console.log('[DataBackup] 自动备份完成');
        } catch (error) {
            console.error('[DataBackup] 自动备份失败:', error);
        }
    };

    // 立即执行一次
    backup();

    // 定期执行
    return setInterval(backup, intervalMs);
}
