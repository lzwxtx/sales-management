import React from 'react';
import { useStore } from '../store/useStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Package, Users, Truck, AlertTriangle, ArrowUpRight } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border border-white/40">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-${color}-500/20`} />
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${color}-100 text-${color}-600`}>
                    <Icon size={24} />
                </div>
                <span className={`flex items-center text-xs font-bold text-${color}-600 bg-${color}-50 px-2 py-1 rounded-full`}>
                    <ArrowUpRight size={14} className="mr-1" /> +2.5%
                </span>
            </div>
            <div className="text-slate-500 text-sm font-medium">{title}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
            <div className="text-xs text-slate-400 mt-2">{subtext}</div>
        </div>
    </div>
);

export default function Dashboard() {
    const { products, partners, consignments, sales } = useStore();

    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStockAlert).length;
    const activeConsignments = consignments.filter(c => c.status === 'CONFIRMED').length;

    // Mock Data for Chart
    const data = [
        { name: 'Mon', sales: 4000 },
        { name: 'Tue', sales: 3000 },
        { name: 'Wed', sales: 2000 },
        { name: 'Thu', sales: 2780 },
        { name: 'Fri', sales: 1890 },
        { name: 'Sat', sales: 2390 },
        { name: 'Sun', sales: 3490 },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="总销售额"
                    value={`¥${totalSales.toLocaleString()}`}
                    subtext="本月累计销售"
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="进行中寄售"
                    value={activeConsignments}
                    subtext="待结清订单"
                    icon={Truck}
                    color="indigo"
                />
                <StatCard
                    title="合作伴"
                    value={partners.length}
                    subtext="活跃合作伙伴"
                    icon={Users}
                    color="purple"
                />
                <StatCard
                    title="库存预景"
                    value={lowStockCount}
                    subtext="种商品库存不足"
                    icon={AlertTriangle}
                    color="orange"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="glass-card p-6 rounded-2xl col-span-2 border border-white/40">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">销售趋势分析</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Low Stock List */}
                <div className="glass-card p-6 rounded-2xl border border-white/40">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" size={20} />
                        库存预警
                    </h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {products.filter(p => p.stock <= p.minStockAlert).map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                                <div>
                                    <div className="font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-red-500">剩余: {p.stock}</div>
                                </div>
                                <button className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded border border-red-200">
                                    补货
                                </button>
                            </div>
                        ))}
                        {lowStockCount === 0 && (
                            <div className="text-center text-slate-400 py-10">库存状态良好</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}