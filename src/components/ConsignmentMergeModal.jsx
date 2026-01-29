import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import Modal from './Modal';
import { format } from 'date-fns';
import { AlertCircle, Package } from 'lucide-react';

export default function ConsignmentMergeModal({ partnerId, onClose }) {
    const { consignments, products, partners, mergeConsignments } = useStore();
    const [selectedIds, setSelectedIds] = useState([]);

    const partner = partners.find(p => p.id === partnerId);

    // Helper function to check if consignment has remaining items
    const hasRemainingItems = (consignment) => {
        const totalSent = consignment.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalSold = (consignment.soldItems || []).reduce((sum, item) => sum + item.quantity, 0);
        const totalReturned = (consignment.returnedItems || []).reduce((sum, item) => sum + item.quantity, 0);
        return totalSent > (totalSold + totalReturned);
    };

    // Calculate remaining items for a consignment
    const calculateRemaining = (consignment) => {
        const totalSent = consignment.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalSold = (consignment.soldItems || []).reduce((sum, item) => sum + item.quantity, 0);
        const totalReturned = (consignment.returnedItems || []).reduce((sum, item) => sum + item.quantity, 0);
        return totalSent - totalSold - totalReturned;
    };

    // Get all mergeable consignments for this partner
    const mergeableOrders = consignments.filter(c =>
        c.partnerId === partnerId &&
        c.status === 'CONFIRMED' &&
        hasRemainingItems(c)
    ).sort((a, b) => new Date(a.createAt) - new Date(b.createAt)); // Sort by creation time

    // Default select all
    useEffect(() => {
        setSelectedIds(mergeableOrders.map(o => o.id));
    }, []);

    const handleMerge = () => {
        if (selectedIds.length < 2) {
            alert('请至少选择2个寄售单进行合并');
            return;
        }

        // The first one (earliest) will be the target
        const targetId = selectedIds[0];
        const sourceIds = selectedIds.slice(1);

        mergeConsignments(targetId, sourceIds);
        onClose();
    };

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Calculate merge preview
    const getMergePreview = () => {
        if (selectedIds.length < 2) return null;

        const selectedOrders = mergeableOrders.filter(o => selectedIds.includes(o.id));

        const totalItems = {};
        const totalSold = {};
        const totalReturned = {};

        selectedOrders.forEach(order => {
            // Items
            order.items.forEach(item => {
                totalItems[item.productId] = (totalItems[item.productId] || 0) + item.quantity;
            });

            // Sold
            (order.soldItems || []).forEach(item => {
                totalSold[item.productId] = (totalSold[item.productId] || 0) + item.quantity;
            });

            // Returned
            (order.returnedItems || []).forEach(item => {
                totalReturned[item.productId] = (totalReturned[item.productId] || 0) + item.quantity;
            });
        });

        const productIds = Object.keys(totalItems);
        const totalRemaining = productIds.reduce((sum, pid) => {
            return sum + totalItems[pid] - (totalSold[pid] || 0) - (totalReturned[pid] || 0);
        }, 0);

        return {
            productCount: productIds.length,
            totalRemaining,
            consignmentCount: selectedIds.length
        };
    };

    const mergePreview = getMergePreview();

    return (
        <Modal isOpen onClose={onClose} title={`合并寄售单 - ${partner?.name}`}>
            <div className="space-y-4">
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">选择要合并的寄售单</p>
                            <p className="text-blue-700">
                                至少选择2个寄售单。最早创建的寄售单将作为合并目标,其他寄售单的数据将合并到该寄售单中。
                            </p>
                        </div>
                    </div>
                </div>

                {/* Consignment List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {mergeableOrders.map((order, index) => {
                        const isSelected = selectedIds.includes(order.id);
                        const isTarget = selectedIds[0] === order.id && selectedIds.length >= 2;

                        return (
                            <div
                                key={order.id}
                                className={`border rounded-lg p-4 transition-all ${isSelected
                                        ? 'border-primary-300 bg-primary-50'
                                        : 'border-slate-200 bg-white'
                                    }`}
                            >
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelection(order.id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-slate-800">
                                                #{order.id.slice(0, 8)}
                                            </span>
                                            {isTarget && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                                                    合并目标
                                                </span>
                                            )}
                                            {index === 0 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                                    最早创建
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div>创建时间: {format(new Date(order.createAt), 'yyyy-MM-dd HH:mm')}</div>
                                            <div className="flex gap-4">
                                                <span>商品: {order.items.length} 种</span>
                                                <span className="text-orange-600">剩余: {calculateRemaining(order)} 件</span>
                                            </div>
                                        </div>

                                        {/* Product details */}
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                            <div className="text-xs text-slate-500 mb-1">包含商品:</div>
                                            <div className="flex flex-wrap gap-2">
                                                {order.items.map(item => {
                                                    const product = products.find(p => p.id === item.productId);
                                                    const sold = (order.soldItems || []).find(s => s.productId === item.productId)?.quantity || 0;
                                                    const returned = (order.returnedItems || []).find(r => r.productId === item.productId)?.quantity || 0;
                                                    const remaining = item.quantity - sold - returned;

                                                    return (
                                                        <div key={item.productId} className="text-xs bg-white border border-slate-200 rounded px-2 py-1">
                                                            <span className="font-medium">{product?.name}</span>
                                                            <span className="text-slate-500 ml-1">
                                                                (剩余 {remaining}/{item.quantity})
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        );
                    })}
                </div>

                {/* Merge Preview */}
                {mergePreview && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Package className="text-green-600 flex-shrink-0" size={20} />
                            <div className="flex-1">
                                <div className="font-medium text-green-900 mb-2">合并预览</div>
                                <div className="text-sm text-green-800 space-y-1">
                                    <div>将 {mergePreview.consignmentCount} 个寄售单合并为 1 个</div>
                                    <div>合并后共 {mergePreview.productCount} 种商品</div>
                                    <div>剩余待结算: {mergePreview.totalRemaining} 件</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleMerge}
                        disabled={selectedIds.length < 2}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-primary-500/30"
                    >
                        确认合并 ({selectedIds.length})
                    </button>
                </div>
            </div>
        </Modal>
    );
}
