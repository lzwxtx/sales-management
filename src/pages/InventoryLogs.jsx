import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../db';
import { format } from 'date-fns';
import { Filter, Search, ArrowLeftRight, Package, ArrowUpRight, ArrowDownLeft, XCircle } from 'lucide-react';

export default function InventoryLogs() {
    const { partners, products } = useStore();
    const [logs, setLogs] = useState([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState('ALL');
    const [selectedType, setSelectedType] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);

            // 查询所有记录
            let allLogs = await db.inventory_logs.reverse().sortBy('date');

            // 应用筛选
            let filtered = allLogs;

            // 按合作伙伴筛选（只对寄售记录有效）
            if (selectedPartnerId !== 'ALL') {
                filtered = filtered.filter(log => log.partnerId === selectedPartnerId);
            }

            // 按记录类型筛选
            if (selectedType === 'CONSIGNMENT') {
                filtered = filtered.filter(log => ['SEND', 'SOLD', 'RETURN'].includes(log.type));
            } else if (selectedType === 'ADJUSTMENT') {
                filtered = filtered.filter(log => ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(log.type));
            }

            setLogs(filtered);
            setLoading(false);
        };

        fetchLogs();
    }, [selectedPartnerId, selectedType]);

    const getPartnerName = (id) => partners.find(p => p.id === id)?.name || '未知合作伙伴';
    const getProductName = (pid) => products.find(p => p.id === pid)?.name || '未知商品';

    const getTypeInfo = (type) => {
        const typeMap = {
            'SEND': { label: '寄出', color: 'blue', icon: ArrowUpRight },
            'SOLD': { label: '售出', color: 'green', icon: Package },
            'RETURN': { label: '退回', color: 'orange', icon: ArrowDownLeft },
            'ADJUSTMENT_IN': { label: '入库调整', color: 'blue', icon: ArrowDownLeft },
            'ADJUSTMENT_OUT': { label: '出库调整', color: 'red', icon: ArrowUpRight }
        };
        return typeMap[type] || typeMap['SEND'];
    };

    const getReasonLabel = (reason) => {
        const reasonMap = {
            'PURCHASE': '采购入库',
            'RETURN': '客户退货',
            'INVENTORY_GAIN': '盘盈',
            'DAMAGE': '损耗报废',
            'INVENTORY_LOSS': '盘亏',
            'OTHER': '其他'
        };
        return reasonMap[reason] || reason;
    };

    const isConsignmentLog = (log) => ['SEND', 'SOLD', 'RETURN'].includes(log.type);

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">出入库记录</h1>
                    <p className="text-slate-500 mt-1">查看所有库存变动记录</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* 记录类型筛选 */}
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer min-w-[120px]"
                        >
                            <option value="ALL">全部类型</option>
                            <option value="CONSIGNMENT">寄售记录</option>
                            <option value="ADJUSTMENT">库存调整</option>
                        </select>
                    </div>

                    {/* 合作伙伴筛选 */}
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
                        {logs.map(log => {
                            const typeInfo = getTypeInfo(log.type);
                            const Icon = typeInfo.icon;
                            const isConsignment = isConsignmentLog(log);

                            return (
                                <div key={log.id} className="p-6 hover:bg-slate-50/60 transition-colors group">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1
                                            bg-${typeInfo.color}-100 text-${typeInfo.color}-600`}>
                                            <Icon size={20} />
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded
                                                            bg-${typeInfo.color}-50 text-${typeInfo.color}-700 ring-1 ring-${typeInfo.color}-100`}>
                                                            {typeInfo.label}
                                                            {log.reason && ` - ${getReasonLabel(log.reason)}`}
                                                        </span>
                                                        <span className="text-slate-400 text-xs">{format(new Date(log.date), 'yyyy-MM-dd HH:mm')}</span>
                                                    </div>
                                                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                                        {isConsignment ? getPartnerName(log.partnerId) : '系统调整'}
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
                                                            {isConsignment && (
                                                                <>
                                                                    <th className="px-4 py-2 text-right">单价</th>
                                                                    <th className="px-4 py-2 text-right">小计</th>
                                                                </>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {log.items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-2 text-slate-700">{getProductName(item.productId)}</td>
                                                                <td className="px-4 py-2 text-right font-medium">{item.quantity}</td>
                                                                {isConsignment ? (
                                                                    <>
                                                                        <td className="px-4 py-2 text-right text-slate-500">¥{item.price || item.unitPrice || 0}</td>
                                                                        <td className="px-4 py-2 text-right text-slate-700">¥{(item.quantity * (item.price || item.unitPrice || 0)).toFixed(2)}</td>
                                                                    </>
                                                                ) : null}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* 显示备注 */}
                                            {log.note && (
                                                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                                    <span className="font-medium">备注：</span>{log.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
