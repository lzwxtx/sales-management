import React, { useState, useMemo } from 'react';
import { Package, Truck, RotateCcw, DollarSign, CheckCircle, FileText } from 'lucide-react';
import { generateConsignmentPDF } from '../utils/pdfGenerator';
import { useStore } from '../store/useStore';
import Modal from './Modal';

export default function ConsignmentDetailModal({ orderId, onClose }) {
    const { consignments, products, partners, registerConsignmentSale, returnConsignmentItems, updateConsignmentStatus } = useStore();
    const order = consignments.find(c => c.id === orderId);
    const partner = partners.find(p => p.id === order?.partnerId);

    const [actionType, setActionType] = useState(null); // 'SALE' or 'RETURN'
    const [actionItems, setActionItems] = useState({}); // { productId: quantity }

    if (!order) return null;

    // Calculate stats per item
    const itemStats = order.items.map(item => {
        const sold = order.soldItems?.find(x => x.productId === item.productId)?.quantity || 0;
        const returned = order.returnedItems?.find(x => x.productId === item.productId)?.quantity || 0;
        const remaining = item.quantity - sold - returned;
        return { ...item, sold, returned, remaining };
    });

    const handleActionChange = (productId, val) => {
        const num = parseInt(val) || 0;
        setActionItems(prev => ({ ...prev, [productId]: num }));
    };

    const submitAction = () => {
        const itemsToProcess = Object.entries(actionItems)
            .filter(([_, qty]) => qty > 0)
            .map(([pid, qty]) => ({
                productId: pid,
                quantity: qty,
                price: order.items.find(x => x.productId === pid).unitPrice
            }));

        if (itemsToProcess.length === 0) return;

        if (actionType === 'SALE') {
            registerConsignmentSale(order.id, itemsToProcess);
        } else if (actionType === 'RETURN') {
            returnConsignmentItems(order.id, itemsToProcess);
        }

        setActionType(null);
        setActionItems({});
    };

    const canEdit = order.status === 'CONFIRMED';
    const isDraft = order.status === 'DRAFT';

    return (
        <Modal isOpen={!!orderId} onClose={onClose} title={`寄售单详情 #${order.id.slice(0, 8)}`}>
            <div className="space-y-6">
                {/* Header Info */}
                <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                        <div className="text-sm text-slate-500">合作伙伴</div>
                        <div className="font-bold text-lg text-slate-800">{partner?.name}</div>
                        <div className="text-xs text-slate-400 mt-1">创建时间: {new Date(order.createAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-500">状态</div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mt-1 ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            order.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                            {order.status === 'CONFIRMED' ? '进行中' : order.status === 'DRAFT' ? '草稿' : '已完成'}
                        </span>
                    </div>
                </div>

                {/* PDF Export Action */}
                <div className="flex justify-end">
                    <button
                        onClick={() => generateConsignmentPDF(order, partner?.name, products)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                        <FileText size={18} />
                        导出 PDF 单据
                    </button>
                </div>

                {/* Action Buttons */}
                {isDraft && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => { updateConsignmentStatus(order.id, 'CONFIRMED'); }}
                            className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg"
                        >
                            确认开启寄售 (扣减库存)
                        </button>
                    </div>
                )}

                {canEdit && !actionType && (
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setActionType('SALE')}
                            className="py-3 px-4 border border-green-200 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 font-medium flex items-center justify-center gap-2"
                        >
                            <DollarSign size={20} />
                            登记回款 (售出)
                        </button>
                        <button
                            onClick={() => setActionType('RETURN')}
                            className="py-3 px-4 border border-orange-200 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 font-medium flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            商品退回
                        </button>
                    </div>
                )}

                {/* Action Form */}
                {actionType && (
                    <div className="bg-white border-2 border-primary-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            {actionType === 'SALE' ? <DollarSign className="text-green-600" /> : <RotateCcw className="text-orange-600" />}
                            {actionType === 'SALE' ? '登记售出商品' : '登记退回商品'}
                        </h4>

                        <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                            {itemStats.filter(i => i.remaining > 0).map(item => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                    <div key={item.productId} className="flex items-center justify-between p-2 border-b border-gray-50 last:border-0">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">{product?.name}</div>
                                            <div className="text-xs text-slate-400">剩余: {item.remaining}</div>
                                        </div>
                                        <input
                                            type="number" min="0" max={item.remaining}
                                            placeholder="0"
                                            className="w-20 px-2 py-1 border rounded text-right"
                                            value={actionItems[item.productId] || ''}
                                            onChange={(e) => handleActionChange(item.productId, e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setActionType(null); setActionItems({}); }} className="text-slate-500 hover:text-slate-800">取消</button>
                            <button
                                onClick={submitAction}
                                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                确认{actionType === 'SALE' ? '回款' : '退回'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Item List */}
                <div>
                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">商品明细</h4>
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-2 text-left">商品</th>
                                    <th className="px-4 py-2 text-center">寄售量</th>
                                    <th className="px-4 py-2 text-center">佣金率</th>
                                    <th className="px-4 py-2 text-center text-green-600">已售</th>
                                    <th className="px-4 py-2 text-center text-orange-600">退回</th>
                                    <th className="px-4 py-2 text-center font-bold">剩余</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {itemStats.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <tr key={item.productId}>
                                            <td className="px-4 py-3 font-medium">{product?.name}</td>
                                            <td className="px-4 py-3 text-center text-slate-500">{item.quantity}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                                    {item.commissionRate || 0}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-green-600 font-medium">{item.sold > 0 ? item.sold : '-'}</td>
                                            <td className="px-4 py-3 text-center text-orange-600 font-medium">{item.returned > 0 ? item.returned : '-'}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-800">{item.remaining}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Close Button */}
                {order.status === 'CONFIRMED' && itemStats.every(i => i.remaining === 0) && (
                    <div className="bg-green-50 p-4 rounded-xl text-green-800 flex items-center justify-between">
                        <span>该寄售单所有商品已结清 (售完或退回)</span>
                        <button
                            onClick={() => { updateConsignmentStatus(order.id, 'COMPLETED'); onClose(); }}
                            className="px-4 py-2 bg-green-200 text-green-800 rounded-lg hover:bg-green-300 font-medium"
                        >
                            标记为完成
                        </button>
                    </div>
                )}

            </div>
        </Modal>
    );
}
