import React, { useState } from 'react';
import { Package, X } from 'lucide-react';
import Modal from './Modal';
import { useStore } from '../store/useStore';

const ADJUSTMENT_TYPES = {
    IN: '入库',
    OUT: '出库'
};

const REASONS = {
    IN: [
        { value: 'PURCHASE', label: '采购入库' },
        { value: 'RETURN', label: '客户退货' },
        { value: 'INVENTORY_GAIN', label: '盘盈' },
        { value: 'OTHER', label: '其他' }
    ],
    OUT: [
        { value: 'DAMAGE', label: '损耗报废' },
        { value: 'INVENTORY_LOSS', label: '盘亏' },
        { value: 'OTHER', label: '其他' }
    ]
};

export default function StockAdjustmentModal({ isOpen, onClose, product }) {
    const { addStockAdjustment } = useStore();
    const [formData, setFormData] = useState({
        type: 'IN',
        reason: 'PURCHASE',
        quantity: '',
        note: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!product) return null;

    const handleTypeChange = (type) => {
        setFormData({
            type,
            reason: REASONS[type][0].value,
            quantity: '',
            note: ''
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const quantity = Number(formData.quantity);
        if (quantity <= 0) {
            setError('调整数量必须大于0');
            return;
        }

        // 出库时检查库存
        if (formData.type === 'OUT' && quantity > product.stock) {
            setError(`库存不足，当前库存仅有 ${product.stock} 件`);
            return;
        }

        setIsSubmitting(true);
        try {
            await addStockAdjustment({
                productId: product.id,
                type: formData.type,
                reason: formData.reason,
                quantity,
                note: formData.note
            });

            // 重置表单
            setFormData({
                type: 'IN',
                reason: 'PURCHASE',
                quantity: '',
                note: ''
            });
            onClose();
        } catch (err) {
            setError(err.message || '调整失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    const predictedStock = () => {
        const quantity = Number(formData.quantity) || 0;
        if (formData.type === 'IN') {
            return product.stock + quantity;
        } else {
            return product.stock - quantity;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="库存调整">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 商品信息 */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">商品名称</span>
                        <span className="font-medium text-slate-800">{product.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">SKU</span>
                        <span className="text-sm text-slate-500">{product.sku}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">当前库存</span>
                        <span className="text-lg font-semibold text-primary-600">{product.stock} 件</span>
                    </div>
                </div>

                {/* 调整类型 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">调整类型</label>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(ADJUSTMENT_TYPES).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleTypeChange(key)}
                                className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${formData.type === key
                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 调整原因 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">调整原因</label>
                    <select
                        required
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                        value={formData.reason}
                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    >
                        {REASONS[formData.type].map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 调整数量 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">调整数量</label>
                    <input
                        required
                        type="number"
                        min="1"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                        value={formData.quantity}
                        onChange={e => {
                            setFormData({ ...formData, quantity: e.target.value });
                            setError('');
                        }}
                        placeholder="请输入调整数量"
                    />
                </div>

                {/* 预计库存 */}
                {formData.quantity && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">调整后库存</span>
                            <span className={`text-lg font-semibold ${predictedStock() < 0 ? 'text-red-600' : 'text-blue-700'
                                }`}>
                                {predictedStock()} 件
                            </span>
                        </div>
                    </div>
                )}

                {/* 备注说明 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">备注说明</label>
                    <textarea
                        rows={3}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        placeholder="选填，记录调整原因或其他说明..."
                    />
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '调整中...' : '确认调整'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
