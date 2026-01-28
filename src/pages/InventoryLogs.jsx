import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../db';
import { format } from 'date-fns';
import { Filter, Search, ArrowLeftRight, Package, ArrowUpRight, ArrowDownLeft, XCircle } from 'lucide-react';

export default function InventoryLogs() {
    const { partners, products } = useStore();
    const [logs, setLogs] = useState([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            let collection = db.consignment_logs;

            if (selectedPartnerId !== 'ALL') {
                collection = collection.where('partnerId').equals(selectedPartnerId);
            }

            const data = await collection.reverse().sortBy('date');
            setLogs(data);
            setLoading(false);
        };

        fetchLogs();
    }, [selectedPartnerId]);

    const getPartnerName = (id) => partners.find(p => p.id === id)?.name || '未知合作伙伴';
    const getProductName = (pid) => products.find(p => p.id === pid)?.name || '未知商品';

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">出入库记录</h1>
                    <p className="text-slate-500 mt-1">查看所有寄售商品的流动记录</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                    <Filter size={18} className="text-slate-400" />
                    <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer min-w-[150px]"
                    >
                        <option value="ALL">全部合作伙伴</option>
                        {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        加载中...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <ArrowLeftRight size={32} className="text-slate-300" />
                        </div>
                        <p>暂无记录</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {logs.map(log => (
                            <div key={log.id} className="p-6 hover:bg-slate-50/60 transition-colors group">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1
                                        ${log.type === 'SEND' ? 'bg-blue-100 text-blue-600' :
                                            log.type === 'SOLD' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {log.type === 'SEND' ? <ArrowUpRight size={20} /> :
                                            log.type === 'SOLD' ? <Package size={20} /> : <ArrowDownLeft size={20} />}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded
                                                        ${log.type === 'SEND' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' :
                                                            log.type === 'SOLD' ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'bg-orange-50 text-orange-700 ring-1 ring-orange-100'}`}>
                                                        {log.type === 'SEND' ? '寄出 (入库)' : log.type === 'SOLD' ? '售出 (出库)' : '退回 (退库)'}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">{format(new Date(log.date), 'yyyy-MM-dd HH:mm')}</span>
                                                </div>
                                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                                    {getPartnerName(log.partnerId)}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-slate-400 block mb-0.5">涉及商品</span>
                                                <span className="font-medium text-slate-900">{log.items.length} 种</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/60 border border-slate-100 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50/50 text-xs text-slate-500 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">商品名称</th>
                                                        <th className="px-4 py-2 text-right">数量</th>
                                                        <th className="px-4 py-2 text-right">单价</th>
                                                        <th className="px-4 py-2 text-right">小计</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {log.items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-2 text-slate-700">{getProductName(item.productId)}</td>
                                                            <td className="px-4 py-2 text-right font-medium">{item.quantity}</td>
                                                            <td className="px-4 py-2 text-right text-slate-500">¥{item.price || item.unitPrice || 0}</td>
                                                            <td className="px-4 py-2 text-right text-slate-700">¥{(item.quantity * (item.price || item.unitPrice || 0)).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
