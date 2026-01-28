import React, { useState } from 'react';
import { Plus, Search, Filter, Truck, PackageCheck, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import ConsignmentWizard from '../components/ConsignmentWizard';
import ConsignmentDetailModal from '../components/ConsignmentDetailModal';
import { format } from 'date-fns';
import { generateConsignmentPDF } from '../utils/pdfGenerator';

export default function ConsignmentList() {
    const { consignments, partners, products } = useStore();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [viewMode, setViewMode] = useState('LIST'); // LIST, STATS
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, DRAFT, CONFIRMED, COMPLETED

    const [selectedOrderId, setSelectedOrderId] = useState(null);

    const filteredConsignments = consignments.filter(c => {
        if (activeTab !== 'ALL' && c.status !== activeTab) return false;
        return true;
    });

    const getPartnerName = (id) => partners.find(p => p.id === id)?.name || '未知合作伙伴';

    // --- Stats Calculation ---
    const partnerStats = partners.map(partner => {
        const partnerConsignments = consignments.filter(c => c.partnerId === partner.id);

        let totalSentValue = 0;
        let totalSoldValue = 0;
        let totalReturnedValue = 0;
        let currentStockCount = 0;

        partnerConsignments.forEach(c => {
            // Sent
            c.items.forEach(item => {
                totalSentValue += item.quantity * item.unitPrice;
            });

            // Sold
            if (c.soldItems) {
                c.soldItems.forEach(item => {
                    // Find price from original items
                    const originalItem = c.items.find(i => i.productId === item.productId);
                    const price = originalItem ? originalItem.unitPrice : 0;
                    totalSoldValue += item.quantity * price;
                });
            }

            // Returned
            if (c.returnedItems) {
                c.returnedItems.forEach(item => {
                    const originalItem = c.items.find(i => i.productId === item.productId);
                    const price = originalItem ? originalItem.unitPrice : 0;
                    totalReturnedValue += item.quantity * price;
                });
            }

            // Current Stock
            const sold = c.soldItems?.reduce((s, i) => s + i.quantity, 0) || 0;
            const returned = c.returnedItems?.reduce((s, i) => s + i.quantity, 0) || 0;
            const total = c.items.reduce((s, i) => s + i.quantity, 0);
            currentStockCount += (total - sold - returned);
        });

        return {
            ...partner,
            totalSentValue,
            totalSoldValue,
            totalReturnedValue,
            currentStockCount
        };
    });

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'LIST' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        寄售单列表
                    </button>
                    <button
                        onClick={() => setViewMode('STATS')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'STATS' ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        合作伙伴统计
                    </button>
                </div>

                {viewMode === 'LIST' && (
                    <div className="flex gap-2">
                        {['ALL', 'DRAFT', 'CONFIRMED', 'COMPLETED'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab
                                    ? 'bg-slate-200 text-slate-800'
                                    : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                {tab === 'ALL' ? '全部' :
                                    tab === 'DRAFT' ? '草稿' :
                                        tab === 'CONFIRMED' ? '进行中' : '已完成'}
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg shadow-primary-500/30 transition-all font-medium"
                >
                    <Plus size={20} />
                    新建寄售单
                </button>
            </div>

            {/* VIEWS */}
            {viewMode === 'LIST' ? (
                <div className="grid grid-cols-1 gap-4">
                    {filteredConsignments.map(order => (
                        <div key={order.id} className="glass-card p-6 rounded-xl border border-white/40 hover:shadow-lg transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-600' :
                                        order.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{getPartnerName(order.partnerId)}</h3>
                                        <div className="flex gap-2 text-sm text-slate-500">
                                            <span>{format(new Date(order.createAt), 'yyyy-MM-dd HH:mm')}</span>
                                            <span>•</span>
                                            <span>共 {order.items.length} 种商品</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                        order.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {order.status === 'CONFIRMED' ? '进行中' : order.status === 'DRAFT' ? '草稿' : '已完成'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-4 grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="text-slate-500 mb-1">总货值 (零售)</div>
                                    <div className="font-medium">¥{order.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 mb-1">已售数量</div>
                                    <div className="font-medium text-green-600">
                                        {order.soldItems?.reduce((s, i) => s + i.quantity, 0) || 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-500 mb-1">已退回</div>
                                    <div className="font-medium text-orange-600">
                                        {order.returnedItems?.reduce((s, i) => s + i.quantity, 0) || 0}
                                    </div>
                                </div>
                                <div className="flex justify-end items-center gap-3">
                                    <button
                                        onClick={() => handleExportPDF(order)}
                                        className="text-slate-500 hover:text-slate-700 font-medium text-xs border border-slate-200 px-3 py-1 rounded hover:bg-white transition-colors"
                                    >
                                        导出 PDF
                                    </button>
                                    <button onClick={() => setSelectedOrderId(order.id)} className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                                        查看详情 &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredConsignments.length === 0 && (
                        <div className="text-center py-20 text-slate-400">没有找到寄售单</div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div className="glass-card rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">合作伙伴</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">累计寄出货值</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">累计已售货值</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">累计退回货值</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">当前持有库存</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {partnerStats.map(stat => (
                                    <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{stat.name}</td>
                                        <td className="px-6 py-4 text-slate-600">¥{stat.totalSentValue.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-green-600">¥{stat.totalSoldValue.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-orange-600">¥{stat.totalReturnedValue.toFixed(2)}</td>
                                        <td className="px-6 py-4 font-bold text-primary-600">{stat.currentStockCount} 件</td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Removed Logs Button */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isWizardOpen && (
                <ConsignmentWizard onClose={() => setIsWizardOpen(false)} />
            )}

            {selectedOrderId && (
                <ConsignmentDetailModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}

            {/* Logs Modal - Placeholder for now until separate component */}

        </div>
    );
}


