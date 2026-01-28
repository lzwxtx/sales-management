import React, { useState } from 'react';
import { Plus, Search, ShoppingBag, CreditCard, Banknote } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import { format } from 'date-fns';

export default function SalesList() {
    const { sales, products, addSale } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // New Sale State
    const [cart, setCart] = useState([]); // [{ productId, quantity }]
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    const handleAddToCart = (product) => {
        const existing = cart.find(i => i.productId === product.id);
        if (existing) {
            setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { productId: product.id, quantity: 1, price: product.retailPrice }]);
        }
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(i => {
            if (i.productId === productId) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(i => i.productId !== productId));
    };

    const handleSubmitSale = () => {
        if (cart.length === 0) return;
        addSale({
            type: 'DIRECT',
            items: cart,
            totalAmount: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0),
            paymentMethod
        });
        setIsModalOpen(false);
        setCart([]);
    };

    const totalAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    return (
        <div className="space-y-6 cart-wrapper">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="搜索销售记录..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg shadow-primary-500/30 transition-all font-medium"
                >
                    <Plus size={20} />
                    新销售单
                </button>
            </div>

            {/* History Table */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/20">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">单号/时间</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">类型</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">商品详情</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">金额</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">支付方式</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sales.sort((a, b) => new Date(b.date) - new Date(a.date)).map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">#{sale.id.slice(0, 8)}</div>
                                    <div className="text-xs text-slate-400">{format(new Date(sale.date), 'yyyy-MM-dd HH:mm')}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${sale.type === 'DIRECT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {sale.type === 'DIRECT' ? '直接销售' : '寄售回款'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {sale.items.length} 件商品
                                    <div className="text-xs text-slate-400 truncate max-w-[200px]">
                                        {sale.items.map(i => products.find(p => p.id === i.productId)?.name).join(', ')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                    ¥{sale.totalAmount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {sale.paymentMethod || '-'}
                                </td>
                            </tr>
                        ))}
                        {sales.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">暂无销售记录</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Sale Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="新建销售单 (直接销售)"
            >
                <div className="flex h-[500px] gap-6">
                    {/* Product List */}
                    <div className="w-1/2 flex flex-col border-r border-gray-100 pr-4">
                        <input
                            placeholder="搜索商品..."
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
                        />
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {products.map(p => (
                                <button
                                    key={p.id}
                                    disabled={p.stock <= 0}
                                    onClick={() => handleAddToCart(p)}
                                    className="w-full text-left p-3 border rounded-lg hover:border-primary-300 transition-colors bg-white flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-slate-400">库存: {p.stock}</div>
                                    </div>
                                    <div className="font-bold text-slate-700">¥{p.retailPrice}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cart */}
                    <div className="w-1/2 flex flex-col">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <ShoppingBag size={18} /> 购物车
                        </h4>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                            {cart.map(item => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                    <div key={item.productId} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                        <div className="text-sm">
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-slate-500">¥{item.price} x {item.quantity}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center">-</button>
                                            <span className="text-sm w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 bg-white border rounded flex items-center justify-center">+</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {cart.length === 0 && <div className="text-center text-slate-400 py-10">购物车为空</div>}
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-500">总计金额</span>
                                <span className="text-2xl font-bold text-primary-600">¥{totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">支付方式</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['CASH', 'WECHAT', 'ALIPAY', 'CARD'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setPaymentMethod(m)}
                                            className={`py-2 text-sm rounded border ${paymentMethod === m
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {m === 'CASH' ? '现金' : m === 'WECHAT' ? '微信' : m === 'ALIPAY' ? '支付宝' : '刷卡'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={cart.length === 0}
                                onClick={handleSubmitSale}
                                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                确认收款
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
