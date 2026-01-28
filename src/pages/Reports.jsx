import React from 'react';
import { useStore } from '../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Reports() {
    const { sales, products, partners } = useStore();

    const salesByType = [
        { name: '直接销售', value: sales.filter(s => s.type === 'DIRECT').reduce((sum, s) => sum + s.totalAmount, 0) },
        { name: '寄售回款', value: sales.filter(s => s.type === 'CONSIGNMENT').reduce((sum, s) => sum + s.totalAmount, 0) },
    ];

    const COLORS = ['#0ea5e9', '#8b5cf6'];

    // Top Products
    const productSales = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        });
    });

    const topProducts = Object.entries(productSales)
        .map(([id, qty]) => ({
            name: products.find(p => p.id === id)?.name || 'Unknown',
            qty
        }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">报表统计</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Composition */}
                <div className="glass-card p-6 rounded-2xl border border-white/40">
                    <h3 className="font-bold text-lg text-slate-700 mb-4">销售构成</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {salesByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => `¥${val.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {salesByType.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                <span className="text-sm font-medium text-slate-600">{entry.name}</span>
                                <span className="text-sm text-slate-400">¥{entry.value.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="glass-card p-6 rounded-2xl border border-white/40">
                    <h3 className="font-bold text-lg text-slate-700 mb-4">热销商品 TOP 5</h3>
                    <div className="space-y-4">
                        {topProducts.map((p, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                                    }`}>{i + 1}</span>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium text-slate-700">{p.name}</span>
                                        <span className="text-sm font-bold text-primary-600">{p.qty}件</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-500 rounded-full"
                                            style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && <div className="text-center text-slate-400 py-10">暂无销售数据</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
