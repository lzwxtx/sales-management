import React, { useState } from 'react';
import { Plus, Search, Filter, Pencil, Trash2, AlertCircle, Package } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import { db } from '../db';
import { useEffect } from 'react';
import { compressImage } from '../utils/imageCompressor';


const ProductImage = ({ src, alt, className }) => {
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        let objectUrl;
        if (src && src.startsWith('local:')) {
            const imageId = src.replace('local:', '');
            db.images.get(imageId).then(record => {
                if (record && record.blob) {
                    objectUrl = URL.createObjectURL(record.blob);
                    setImageSrc(objectUrl);
                }
            });
        } else {
            setImageSrc(src);
        }
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (!imageSrc) {
        return <div className={`bg-slate-100 flex items-center justify-center text-slate-400 text-xs ${className}`}>暂无</div>;
    }

    return <img src={imageSrc} alt={alt} className={className} />;
};

export default function ProductList() {
    const { products, addProduct, updateProduct, deleteProduct } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);
    const [adjustingProduct, setAdjustingProduct] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        costPrice: '',
        retailPrice: '',
        stock: '',
        minStockAlert: '10',
        imageUrl: '',
        material: '',
        description: ''
    });

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                sku: product.sku,
                category: product.category,
                costPrice: product.costPrice,
                retailPrice: product.retailPrice,
                stock: product.stock,
                minStockAlert: product.minStockAlert,
                imageUrl: product.imageUrl || '',
                material: product.material || '',
                description: product.description || ''
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                sku: `SKU-${Math.floor(Math.random() * 10000)}`,
                category: '',
                retailPrice: '',
                stock: '',
                minStockAlert: '10',
                imageUrl: '',
                material: '',
                description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            costPrice: Number(formData.costPrice),
            retailPrice: Number(formData.retailPrice),
            stock: Number(formData.stock),
            minStockAlert: Number(formData.minStockAlert),
        };

        if (editingProduct) {
            updateProduct(editingProduct.id, data);
        } else {
            addProduct(data);
        }
        setIsModalOpen(false);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="搜索商品名称或SKU..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all shadow-lg shadow-primary-500/30 font-medium"
                >
                    <Plus size={20} />
                    新增商品
                </button>
            </div>

            {/* Product Table */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">商品信息</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">材质/描述</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">价格 (进/销)</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">利润率</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600">库存</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.map(product => {
                                const margin = ((product.retailPrice - product.costPrice) / product.retailPrice * 100).toFixed(1);
                                const isLowStock = product.stock <= product.minStockAlert;

                                return (
                                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <ProductImage
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800">{product.name}</span>
                                                    <span className="text-xs text-slate-400">{product.sku}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-sm max-w-[150px]">
                                                <span className="font-medium text-slate-700 truncate" title={product.material}>{product.material || '-'}</span>
                                                <span className="text-xs text-slate-400 truncate" title={product.description}>{product.description || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-sm">
                                                <span className="text-slate-500">¥{product.costPrice}</span>
                                                <span className="font-medium text-slate-800">¥{product.retailPrice}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${Number(margin) > 30 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {margin}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-medium ${isLowStock ? 'text-red-500' : 'text-slate-700'}`}>
                                                    {product.stock}
                                                </span>
                                                {isLowStock && <AlertCircle size={16} className="text-red-500" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setAdjustingProduct(product);
                                                        setIsStockAdjustmentOpen(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="调整库存"
                                                >
                                                    <Package size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(product)}
                                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteProduct(product.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        暂无商品数据，请添加新商品
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? '编辑商品' : '新增商品'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">商品名称</label>
                            <input
                                required
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">SKU (自动生成)</label>
                            <input
                                className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">商品图片</label>
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {formData.imageUrl ? (
                                    <ProductImage src={formData.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-slate-400">无图片</span>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            try {
                                                // 显示原始图片预览
                                                setFormData({
                                                    ...formData,
                                                    imageUrl: URL.createObjectURL(file)
                                                });

                                                // 压缩图片 (最大800x800, 质量0.8)
                                                const compressedFile = await compressImage(file, 800, 800, 0.8);

                                                // 更新为压缩后的图片
                                                setFormData({
                                                    ...formData,
                                                    imageFile: compressedFile,
                                                    imageUrl: URL.createObjectURL(compressedFile)
                                                });
                                            } catch (error) {
                                                console.error('图片压缩失败:', error);
                                                alert('图片处理失败,请重试');
                                            }
                                        }
                                    }}
                                    className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-primary-50 file:text-primary-700
                                        hover:file:bg-primary-100"
                                />
                                <input
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 outline-none placeholder:text-slate-400"
                                    placeholder="或输入图片 URL..."
                                    value={formData.imageUrl && !formData.imageUrl.startsWith('blob:') && !formData.imageUrl.startsWith('local:') ? formData.imageUrl : ''}
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value, imageFile: null })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">材质</label>
                            <input
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                                value={formData.material}
                                onChange={e => setFormData({ ...formData, material: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1"></div> {/* Placeholder for grid alignment if needed, or remove grid */}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">商品描述</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">进货价</label>
                            <input
                                required type="number" step="0.01"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                                value={formData.costPrice}
                                onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">零售价</label>
                            <input
                                required type="number" step="0.01"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                                value={formData.retailPrice}
                                onChange={e => setFormData({ ...formData, retailPrice: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-500 pt-8 block text-center">
                                预计利润: {formData.retailPrice && formData.costPrice ? ((formData.retailPrice - formData.costPrice) / formData.retailPrice * 100).toFixed(1) : 0}%
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                                {editingProduct ? '当前库存' : '初始库存'}
                            </label>
                            <input
                                required
                                type="number"
                                disabled={!!editingProduct}
                                className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none ${editingProduct ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                                    }`}
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                            />
                            {editingProduct && (
                                <p className="text-xs text-slate-500">
                                    💡 库存只能通过库存调整功能修改
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">库存预警阈值</label>
                            <input
                                required type="number"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none"
                                value={formData.minStockAlert}
                                onChange={e => setFormData({ ...formData, minStockAlert: e.target.value })}
                            />
                        </div>
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
                            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg shadow-primary-500/30 transition-all"
                        >
                            保存
                        </button>
                    </div>
                </form>
            </Modal>

            <StockAdjustmentModal
                isOpen={isStockAdjustmentOpen}
                onClose={() => {
                    setIsStockAdjustmentOpen(false);
                    setAdjustingProduct(null);
                }}
                product={adjustingProduct}
            />
        </div>
    );
}
