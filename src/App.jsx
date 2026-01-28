import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import PartnerList from './pages/PartnerList';
import ConsignmentList from './pages/ConsignmentList';
import SalesList from './pages/SalesList';
import InventoryLogs from './pages/InventoryLogs';
import Reports from './pages/Reports';
import { useStore } from './store/useStore';
import { db } from './db';

function App() {
  useEffect(() => {
    const initApp = async () => {
      // 1. Migration from LocalStorage (if DB is empty)
      const count = await db.products.count();
      if (count === 0) {
        const ls = localStorage.getItem('sales-system-storage');
        if (ls) {
          try {
            const parsed = JSON.parse(ls);
            const state = parsed.state;
            if (state) {
              console.log("Migrating data from LocalStorage to Dexie...");
              await db.transaction('rw', db.products, db.partners, db.consignments, db.sales, async () => {
                if (state.products?.length) await db.products.bulkAdd(state.products);
                if (state.partners?.length) await db.partners.bulkAdd(state.partners);
                if (state.consignments?.length) await db.consignments.bulkAdd(state.consignments);
                if (state.sales?.length) await db.sales.bulkAdd(state.sales);
              });
              console.log("Migration complete.");
            }
          } catch (e) {
            console.error("Migration failed:", e);
          }
        }
      }
      // 2. Init Store
      useStore.getState().init();
    };

    initApp();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="partners" element={<PartnerList />} />
          <Route path="consignments" element={<ConsignmentList />} />
          <Route path="sales" element={<SalesList />} />
          <Route path="inventory-logs" element={<InventoryLogs />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
