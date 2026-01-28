import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingBag, Truck, BarChart3, Settings, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';

const SidebarItem = ({ to, icon: Icon, label }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                    : "text-slate-600 hover:bg-white/50 hover:text-primary-600"
            )}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
            </div>
        </NavLink>
    );
};

export default function MainLayout() {
    const location = useLocation();

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return '系统仪表板';
            case '/products': return '商品管理';
            case '/partners': return '合作伙伴';
            case '/consignments': return '寄售管理';
            case '/sales': return '销售记录';
            case '/inventory-logs': return '出入库记录';
            case '/reports': return '报表统计';
            default: return '销售管理系统';
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            {/* Sidebar */}
            <aside className="w-64 fixed h-full glass-card border-r border-white/40 z-20 m-4 rounded-2xl flex flex-col">
                <div className="p-6 border-b border-gray-100/50">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                        SalesOS
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">智能销售管理系统</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <SidebarItem to="/" icon={LayoutDashboard} label="仪表板" />
                    <SidebarItem to="/products" icon={Package} label="商品管理" />
                    <SidebarItem to="/partners" icon={Users} label="合作伙伴" />
                    <SidebarItem to="/consignments" icon={Truck} label="寄售管理" />
                    <SidebarItem to="/sales" icon={ShoppingBag} label="销售记录" />
                    <SidebarItem to="/inventory-logs" icon={ArrowLeftRight} label="出入库记录" />
                    <SidebarItem to="/reports" icon={BarChart3} label="报表统计" />
                </nav>

                <div className="p-4 border-t border-gray-100/50">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white shadow-lg">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="font-bold text-xs">A</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium">管理员</p>
                            <p className="text-[10px] text-slate-300">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-[calc(16rem+2rem)] p-8">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{getPageTitle()}</h2>
                        <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full hover:bg-white/50 transition-colors text-slate-500 relative">
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            {/* Bell Icon Mock */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                        </button>
                    </div>
                </header>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
