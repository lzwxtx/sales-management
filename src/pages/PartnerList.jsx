import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';

export default function PartnerList() {
    const { partners, addPartner, updatePartner } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        phone: '',
        defaultCommissionRate: '20'
    });

    const handleOpenModal = (partner = null) => {
        if (partner) {
            setEditingId(partner.id);
            setFormData({
                name: partner.name,
                contact: partner.contact || '',
                phone: partner.phone || '',
                defaultCommissionRate: partner.defaultCommissionRate
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                contact: '',
                phone: '',
                defaultCommissionRate: '20'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            defaultCommissionRate: Number(formData.defaultCommissionRate)
        };

        if (editingId) {
            updatePartner(editingId, data);
        } else {
            addPartner(data);
        }
        setIsModalOpen(false);
    };

    const filteredPartners = partners.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="搜索合作伙伴..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg shadow-primary-500/30"
                >
                    <Plus size={20} />
                    新增合作伙伴
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPartners.map(partner => (
                    <div key={partner.id} className="glass-card p-6 rounded-xl hover:shadow-xl transition-all group border border-white/40">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{partner.name}</h3>
                                    <p className="text-sm text-slate-500">{partner.contact} {partner.phone}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(partner)}
                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                >
                                    <Pencil size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-slate-500">默认佣金率</span>
                            <span className="text-lg font-bold text-primary-600">{partner.defaultCommissionRate}%</span>
                        </div>
                    </div>
                ))}
                {filteredPartners.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white/30 rounded-xl border border-dashed border-slate-300">
                        暂无合作伙伴，请添加
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? '编辑合作伙伴' : '新增合作伙伴'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">合作伙伴名称</label>
                        <input
                            required
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">联系人</label>
                            <input
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">联系电话</label>
                            <input
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">默认佣金率 (%)</label>
                        <input
                            required type="number" min="0" max="100"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
                            value={formData.defaultCommissionRate}
                            onChange={e => setFormData({ ...formData, defaultCommissionRate: e.target.value })}
                        />
                        <p className="text-xs text-slate-400">该比率将作为新建寄售单的默认值</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            保存
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
