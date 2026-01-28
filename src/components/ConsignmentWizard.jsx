import React, { useState } from 'react';
import { User, Package, ChevronRight, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function ConsignmentWizard({ onClose }) {
    const { partners, products, addConsignment } = useStore();
    const [step, setStep] = useState(1);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [selectedProducts, setSelectedProducts] = useState([]); // [{ productId, quantity, unitPrice }]

    // Helpers
    const currentPartner = partners.find(p => p.id === selectedPartnerId);

    const handleAddProduct = (product) => {
        const exists = selectedProducts.find(p => p.productId === product.id);
        if (exists) return;
        setSelectedProducts([...selectedProducts, {
            productId: product.id,
            quantity: 1,
            unitPrice: product.retailPrice,
            maxStock: product.stock
        }]);
    };

    const updateItem = (productId, field, value) => {
        setSelectedProducts(selectedProducts.map(item =>
            item.productId === productId ? { ...item, [field]: Number(value) } : item
        ));
    };

    const removeItem = (productId) => {
        setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
    };

    const handleSubmit = () => {
        if (!selectedPartnerId || selectedProducts.length === 0) return;

        addConsignment({
            partnerId: selectedPartnerId,
            items: selectedProducts.map(({ productId, quantity, unitPrice }) => ({
                productId, quantity, unitPrice
            })),
            totalValue: selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">新建寄售单</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <span className={step >= 1 ? 'text-primary-600 font-medium' : ''}>1. 选择合作伙伴</span>
                        <ChevronRight size={14} />
                        <span className={step >= 2 ? 'text-primary-600 font-medium' : ''}>2. 选择商品</span>
                        <ChevronRight size={14} />
                        <span className={step >= 3 ? 'text-primary-600 font-medium' : ''}>3. 确认</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-700">取消</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold mb-4">请选择寄售合作伙伴</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {partners.map(partner => (
                                <button
                                    key={partner.id}
                                    onClick={() => setSelectedPartnerId(partner.id)}
                                    className={`p-6 rounded-xl border text-left transition-all ${selectedPartnerId === partner.id
                                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                            : 'border-slate-200 bg-white hover:border-primary-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <User className="text-primary-500" />
                                        <span className="font-bold text-slate-800">{partner.name}</span>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        <p>联系人: {partner.contact}</p>
                                        <p>佣金率: {partner.defaultCommissionRate}%</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid grid-cols-12 gap-8 h-full">
                        {/* Product Picker */}
                        <div className="col-span-5 bg-white rounded-xl border border-slate-200 p-4 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                            <input
                                placeholder="搜索商品..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
                            />
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {products.map(product => {
                                    const isSelected = selectedProducts.some(p => p.productId === product.id);
                                    return (
                                        <button
                                            key={product.id}
                                            disabled={isSelected || product.stock <= 0}
                                            onClick={() => handleAddProduct(product)}
                                            className={`w-full p-3 rounded-lg border flex items-center justify-between ${isSelected ? 'bg-slate-50 border-slate-100 opacity-50' : 'hover:border-primary-300 bg-white'
                                                }`}
                                        >
                                            <div className="text-left">
                                                <div className="font-medium">{product.name}</div>
                                                <div className="text-xs text-slate-400">Stock: {product.stock}</div>
                                            </div>
                                            {isSelected && <Check size={16} className="text-green-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Items */}
                        <div className="col-span-7 bg-white rounded-xl border border-slate-200 p-4 flex flex-col h-[calc(100vh-200px)]">
                            <h3 className="font-bold mb-4">已选商品 ({selectedProducts.length})</h3>
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {selectedProducts.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return (
                                        <div key={item.productId} className="flex items-center gap-4 p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-medium">{product.name}</div>
                                                <div className="text-xs text-slate-500">￥{item.unitPrice} / 件</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-slate-400">数量</label>
                                                <input
                                                    type="number" min="1" max={product.stock}
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.productId, 'quantity', e.target.value)}
                                                    className="w-20 px-2 py-1 border rounded text-center"
                                                />
                                            </div>
                                            <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600">
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                                {selectedProducts.length === 0 && (
                                    <div className="text-center text-slate-400 py-10">请从左侧选择商品</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h3 className="text-xl font-bold">准备创建寄售单</h3>
                            <p className="text-slate-500">请确认以下信息无误</p>
                        </div>

                        <div className="space-y-4 border-t border-b border-gray-100 py-6">
                            <div className="flex justify-between">
                                <span className="text-slate-500">合作伙伴</span>
                                <span className="font-medium">{currentPartner?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">商品种类</span>
                                <span className="font-medium">{selectedProducts.length} 种</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">总件数</span>
                                <span className="font-medium">{selectedProducts.reduce((a, b) => a + b.quantity, 0)} 件</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">总货值 (零售价)</span>
                                <span className="font-bold text-lg text-primary-600">
                                    ¥{selectedProducts.reduce((a, b) => a + (b.quantity * b.unitPrice), 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-100 p-4 flex justify-end gap-3">
                {step > 1 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="px-6 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        上一步
                    </button>
                )}
                {step < 3 ? (
                    <button
                        disabled={step === 1 && !selectedPartnerId || step === 2 && selectedProducts.length === 0}
                        onClick={() => setStep(step + 1)}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        下一步
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/30"
                    >
                        确认创建
                    </button>
                )}
            </div>
        </div>
    );
}
