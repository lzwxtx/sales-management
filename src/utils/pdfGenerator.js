import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

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

        reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            doc.addFileToVFS('NotoSansSC-Regular.ttf', base64data);
            doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
            doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'bold'); // Register as bold too
            doc.setFont('NotoSansSC');

            // 1. Header
            doc.setFontSize(22);
            doc.text("寄售单 (Consignment Order)", 14, 20);

            doc.setFontSize(10);
            doc.text(`订单号 (ID): ${order.id}`, 14, 30);
            doc.text(`日期 (Date): ${format(new Date(order.createAt), 'yyyy-MM-dd HH:mm')}`, 14, 35);
            doc.text(`合作伙伴 (Partner): ${partnerName || 'Unknown'}`, 14, 45);

            // 2. Table Data
            const tableColumn = ["商品名称 (Product)", "SKU", "单价 (Price)", "数量 (Qty)", "小计 (Total)"];
            const tableRows = [];

            order.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const name = product ? product.name : item.productId;
                const sku = product ? product.sku : '-';

                tableRows.push([
                    name,
                    sku,
                    `¥${item.unitPrice}`,
                    item.quantity,
                    `¥${(item.unitPrice * item.quantity).toFixed(2)}`
                ]);
            });

            // 3. Generate Table
            autoTable(doc, {
                startY: 55,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [66, 139, 202], font: 'NotoSansSC', fontStyle: 'bold' },
                styles: { font: 'NotoSansSC' }, // Apply font to body
            });

            // 4. Footer / Summary
            const finalY = doc.lastAutoTable?.finalY || 100;
            const totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            doc.setFontSize(12);
            doc.text(`总金额 (Total Value): ¥${totalAmount.toFixed(2)}`, 14, finalY + 10);

            // 5. Save
            doc.save(`consignment_${order.id.slice(0, 8)}.pdf`);
        };

        return true;
    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("PDF 生成失败，请检查控制台错误 (可能是字体文件加载失败)");
        return false;
    }
};
