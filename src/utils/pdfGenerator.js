import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { db } from '../db';

// 辅助函数: 加载商品图片并转换为base64
const loadProductImage = async (product) => {
    try {
        if (!product.imageUrl) return null;

        // 处理本地图片 (从 IndexedDB)
        if (product.imageUrl.startsWith('local:')) {
            const imageId = product.imageUrl.replace('local:', '');
            const imageRecord = await db.images.get(imageId);
            if (imageRecord && imageRecord.blob) {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(imageRecord.blob);
                });
            }
        } else {
            // 处理外部URL图片
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg'));
                };
                img.onerror = () => resolve(null);
                img.src = product.imageUrl;
            });
        }
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
    return null;
};

export const generateConsignmentPDF = async (order, partnerName, products) => {
    try {
        const doc = new jsPDF();

        // Load Chinese Font
        const response = await fetch('/fonts/NotoSansSC-Regular.ttf');
        if (!response.ok) {
            throw new Error('Failed to load font file');
        }
        const fontBlob = await response.blob();

        // Read the blob as Base64
        const reader = new FileReader();
        reader.readAsDataURL(fontBlob);

        reader.onloadend = async () => {
            const base64data = reader.result.split(',')[1];
            doc.addFileToVFS('NotoSansSC-Regular.ttf', base64data);
            doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
            doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'bold');
            doc.setFont('NotoSansSC');

            // 1. Header
            doc.setFontSize(22);
            doc.text("寄售单", 14, 20);

            doc.setFontSize(10);
            doc.text(`订单号: ${order.id}`, 14, 30);
            doc.text(`日期: ${format(new Date(order.createAt), 'yyyy-MM-dd HH:mm')}`, 14, 35);
            doc.text(`合作伙伴: ${partnerName || 'Unknown'}`, 14, 45);

            // 2. 预加载所有商品图片
            const productImages = {};
            for (const item of order.items) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const imageData = await loadProductImage(product);
                    if (imageData) {
                        productImages[item.productId] = imageData;
                    }
                }
            }

            // 3. Table Data
            const tableColumn = ["图片", "商品名称", "佣金率", "单价", "数量", "小计"];
            const tableRows = [];

            order.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const name = product ? product.name : item.productId;
                const commissionRate = item.commissionRate || 0;

                tableRows.push([
                    '', // 图片列 - 将在 didDrawCell 中绘制
                    name,
                    `${commissionRate}%`,
                    `¥${item.unitPrice}`,
                    item.quantity,
                    `¥${(item.unitPrice * item.quantity).toFixed(2)}`
                ]);
            });

            // 4. Generate Table with Images
            autoTable(doc, {
                startY: 55,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [66, 139, 202],
                    font: 'NotoSansSC',
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    font: 'NotoSansSC',
                    halign: 'center',
                    valign: 'middle'
                },
                columnStyles: {
                    0: { cellWidth: 30, halign: 'center' }, // 图片列 (增大)
                    1: { cellWidth: 55, halign: 'left' },   // 商品名称
                    2: { cellWidth: 25 },                    // 佣金率
                    3: { cellWidth: 28 },                    // 单价
                    4: { cellWidth: 18 },                    // 数量
                    5: { cellWidth: 34 }                     // 小计
                },
                didDrawCell: (data) => {
                    // 在图片列绘制图片
                    if (data.column.index === 0 && data.section === 'body') {
                        const rowIndex = data.row.index;
                        const item = order.items[rowIndex];
                        const imageData = productImages[item.productId];

                        if (imageData) {
                            const cellX = data.cell.x;
                            const cellY = data.cell.y;
                            const cellWidth = data.cell.width;
                            const cellHeight = data.cell.height;

                            // 图片尺寸 (保持在单元格内,留边距)
                            const imgSize = Math.min(cellWidth - 4, cellHeight - 4, 30);
                            const imgX = cellX + (cellWidth - imgSize) / 2;
                            const imgY = cellY + (cellHeight - imgSize) / 2;

                            try {
                                doc.addImage(imageData, 'JPEG', imgX, imgY, imgSize, imgSize);
                            } catch (error) {
                                console.error('Error adding image to PDF:', error);
                            }
                        }
                    }
                }
            });

            // 5. Footer / Summary
            const finalY = doc.lastAutoTable?.finalY || 100;
            const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            doc.setFontSize(12);
            doc.text(`总金额: ¥${totalAmount.toFixed(2)}`, 14, finalY + 10);

            // 6. Save
            doc.save(`consignment_${order.id.slice(0, 8)}.pdf`);
        };

        return true;
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("PDF 生成失败,请检查控制台错误 (可能是字体文件加载失败)");
        return false;
    }
};
