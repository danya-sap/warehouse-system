import { useState, useEffect } from 'react';
import axios from 'axios';
import AddStockModal from './components/AddStockModal';

/**
 * ГЛАВНЫЙ КОМПОНЕНТ СИСТЕМЫ УПРАВЛЕНИЯ СКЛАДОМ (WMS)
 * Включает в себя: 
 * - Авторизацию
 * - Аналитические виджеты
 * - Формы управления номенклатурой
 * - Систему резервирования (Заказы)
 * - Детальный реестр остатков с учетом сроков годности
 */
function App() {
  // --- СОСТОЯНИЯ АВТОРИЗАЦИИ ---
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [userRole, setUserRole] = useState<string>(
    localStorage.getItem('role') || ''
  );

  // --- ДАННЫЕ ИЗ API ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // --- УПРАВЛЕНИЕ СПИСКАМИ (ФИЛЬТРЫ / ПАГИНАЦИЯ) ---
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // --- СОСТОЯНИЯ ДЛЯ ФОРМ ВХОДА ---
  const [email, setEmail] = useState('superadmin@warehouse.com');
  const [password, setPassword] = useState('admin123');

  // --- СОСТОЯНИЯ ДЛЯ СОЗДАНИЯ ТОВАРА ---
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newUnit, setNewUnit] = useState('шт');

  // --- СОСТОЯНИЯ ДЛЯ ЗАКАЗОВ ---
  const [qty, setQty] = useState(1);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState('');
  const [customerName, setCustomerName] = useState('');

  // --- МОДАЛЬНЫЕ ОКНА И ОПЕРАЦИИ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [dispatchAmounts, setDispatchAmounts] = useState<Record<string, number>>({});

  // --------------------------------------------------------------------------
  // БЛОК API ЗАПРОСОВ
  // --------------------------------------------------------------------------

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/products`, {
        params: { 
          page, 
          limit: 5, 
          search 
        },
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });
      setProducts(res.data.data);
      setTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error('Ошибка при загрузке товаров:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/orders', {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Ошибка при загрузке заказов:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', { 
        email, 
        password 
      });
      const { access_token, role } = res.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('role', role);
      
      setToken(access_token);
      setUserRole(role);
    } catch (err) {
      alert('Ошибка авторизации. Проверьте данные.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        'http://localhost:3000/api/products',
        {
          name: newName,
          sku: newSku,
          unit: newUnit,
          price: 0,
          categoryName: 'Общее',
        },
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      setNewName('');
      setNewSku('');
      fetchProducts();
    } catch (err) {
      alert('Ошибка при создании карточки товара');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return alert('Выберите товар');
    
    try {
      await axios.post(
        'http://localhost:3000/api/orders',
        {
          customer: customerName,
          items: [
            { 
              productId: selectedProductForOrder, 
              quantity: qty 
            }
          ],
        },
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      setCustomerName('');
      setQty(1);
      fetchOrders();
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка резервирования');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Отменить заказ и вернуть товар из резерва?')) return;

    try {
      await axios.delete(`http://localhost:3000/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrders();
      fetchProducts();
    } catch (err: any) {
      alert('Ошибка при удалении заказа');
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await axios.post(
        `http://localhost:3000/api/orders/${orderId}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchOrders();
      fetchProducts();
    } catch (err: any) {
      alert('Ошибка при выполнении отгрузки');
    }
  };

  const handleDispatch = async (productId: string) => {
    const amount = dispatchAmounts[productId] || 1;
    try {
      await axios.post(
        'http://localhost:3000/api/stock/dispatch',
        {
          productId,
          quantity: Number(amount),
        },
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      setDispatchAmounts((prev) => ({ ...prev, [productId]: 1 }));
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Недостаточно товара на складе');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Вы точно хотите удалить SKU? Это возможно только если не было операций.')) return;
    try {
      await axios.delete(`http://localhost:3000/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts();
    } catch (err) {
      alert('Удаление запрещено: по данному товару есть история движений');
    }
  };

  // Вызов данных при изменении зависимостей
  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchOrders();
    }
  }, [token, page, search]);

  // --------------------------------------------------------------------------
  // ИНТЕРФЕЙС ВХОДА
  // --------------------------------------------------------------------------

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-block bg-blue-600 text-white p-4 rounded-2xl mb-4 shadow-lg shadow-blue-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
              WMS <span className="text-blue-600 font-light">PRO</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-2">Введите данные для доступа к складу</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Электронная почта</label>
              <input
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@warehouse.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Пароль доступа</label>
              <input
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-[0.98] uppercase tracking-widest text-sm"
              type="submit"
            >
              Войти в систему
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ОСНОВНОЙ ДЕШБОРД
  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased selection:bg-blue-100">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ НАВИГАЦИИ */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="bg-slate-900 p-2.5 rounded-xl text-white font-black text-xl shadow-lg shadow-slate-200">
            W
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">
              СКЛАД<span className="text-blue-600">ПРО</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                System Online — {userRole}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-500 hover:text-rose-600 hover:border-rose-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ВЫЙТИ
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        
        {/* ВИДЖЕТЫ АНАЛИТИКИ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Всего SKU</p>
            <p className="text-3xl font-black">{products.length}</p>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Остатки (всего)</p>
            <p className="text-3xl font-black text-blue-600">
              {products.reduce((acc, p: any) => acc + (p.totalStock || 0), 0)}
            </p>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">В резерве</p>
            <p className="text-3xl font-black text-amber-600">
              {orders.filter((o: any) => o.status === 'NEW').length}
            </p>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Отгружено</p>
            <p className="text-3xl font-black text-emerald-600">
              {orders.filter((o: any) => o.status === 'COMPLETED').length}
            </p>
          </div>
        </div>

        {/* ПАНЕЛЬ УПРАВЛЕНИЯ (ФОРМЫ) */}
        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
            
            {/* РЕГИСТРАЦИЯ ТОВАРА */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M22 19h-6v-4h6v4zm-11.5 0h-6v-4h6v4zm11.5-6h-6v-4h6v4zm-11.5 0h-6v-4h6v4zm11.5-6h-6v-4h6v4zm-11.5 0h-6v-4h6v4z"/></svg>
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-8 text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Новая номенклатура
              </h3>
              <form onSubmit={handleAddProduct} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Наименование</label>
                  <input
                    placeholder="Напр: Кабель силовой ВВГ 3х2.5"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Артикул / SKU</label>
                    <input
                      placeholder="SKU-001"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ед. изм.</label>
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all font-bold"
                    >
                      <option value="шт">ШТУКИ (ШТ)</option>
                      <option value="кг">КИЛОГРАММЫ (КГ)</option>
                      <option value="м">МЕТРЫ (М)</option>
                      <option value="уп">УПАКОВКИ (УП)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg active:scale-[0.99] uppercase text-xs tracking-widest"
                >
                  Создать карточку товара
                </button>
              </form>
            </div>

            {/* СОЗДАНИЕ ЗАКАЗА */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-8 text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Резервирование под клиента
              </h3>
              <form onSubmit={handleCreateOrder} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Контрагент / Клиент</label>
                  <input
                    placeholder="ООО 'Вектор' или ФИО"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-5">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Выбор позиции</label>
                    <select
                      value={selectedProductForOrder}
                      onChange={(e) => setSelectedProductForOrder(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all font-medium"
                      required
                    >
                      <option value="">Выберите из каталога...</option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id} disabled={p.totalStock <= 0}>
                          {p.name} (Доступно: {p.totalStock} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Кол-во</label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all font-bold"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg active:scale-[0.99] uppercase text-xs tracking-widest"
                >
                  Оформить резерв (NEW)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ЖУРНАЛ ЗАКАЗОВ */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden mb-16">
          <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h2 className="font-black text-xl tracking-tight text-slate-800">Активные заказы</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ожидают сборки или отгрузки</p>
            </div>
            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-[10px] font-black uppercase">
              {orders.length} записей
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                  <th className="px-10 py-5">Контрагент / ID</th>
                  <th className="px-10 py-5">Состав заказа</th>
                  <th className="px-10 py-5 text-center">Статус</th>
                  <th className="px-10 py-5 text-right">Управление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{o.customer}</div>
                      <div className="text-[10px] text-slate-300 font-mono mt-1">UUID: {o.id.toUpperCase()}</div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="space-y-1">
                        {o.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            {item.product?.name} 
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-blue-600 font-black">
                              {item.quantity} {item.product?.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        o.status === 'COMPLETED' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-amber-100 text-amber-600 animate-pulse'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${o.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {o.status === 'COMPLETED' ? 'Отгружен' : 'В резерве'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        {o.status !== 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => handleCompleteOrder(o.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-lg shadow-emerald-100 uppercase"
                            >
                              Отгрузить
                            </button>
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              className="bg-white border-2 border-rose-100 text-rose-500 px-5 py-2.5 rounded-xl text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all uppercase"
                            >
                              Отмена
                            </button>
                          </>
                        )}
                        {o.status === 'COMPLETED' && (
                          <span className="text-[10px] font-black text-slate-300 uppercase italic">Закрыт</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* РЕЕСТР ТОВАРОВ И СКЛАДСКИХ ПАРТИЙ */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden ring-1 ring-slate-200">
          <div className="px-10 py-10 border-b border-slate-100 bg-slate-50/30 flex flex-wrap justify-between items-end gap-6">
            <div className="space-y-2">
              <h2 className="font-black text-2xl tracking-tight text-slate-800">Складская Ведомость</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Учет по партиям и срокам годности (FEFO)
              </p>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  placeholder="Быстрый поиск по артикулу или названию..."
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-sm shadow-sm"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 bg-slate-50/20">
                  <th className="px-10 py-6">Номенклатура</th>
                  <th className="px-10 py-6">Складские партии (Партия / Срок)</th>
                  <th className="px-10 py-6 text-center">Доступный остаток</th>
                  <th className="px-10 py-6 text-right">Операции</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p: any) => (
                  <tr key={p.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-10 py-8 align-top">
                      <div className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{p.name}</div>
                      <div className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-mono font-bold rounded-lg tracking-wider">
                        REF: {p.sku}
                      </div>
                    </td>

                    {/* ДЕТАЛИЗАЦИЯ ПАРТИЙ — СКРЫВАЕМ НУЛЕВЫЕ ОСТАТКИ */}
<td className="px-10 py-8 align-top">
  <div className="space-y-3">
    {p.stock && p.stock.length > 0 && p.stock.some((s: any) => s.quantity > 0) ? (
      p.stock
        .filter((stock: any) => stock.quantity > 0) // Убираем пустые партии из списка
        .map((stock: any, sIdx: number) => {
          const isExpired = stock.expiryDate && new Date(stock.expiryDate) < new Date();
          const isUrgent = stock.expiryDate && (new Date(stock.expiryDate).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000);
          
          return (
            <div key={sIdx} className="flex flex-col border-l-4 border-slate-200 pl-4 py-1 hover:border-blue-400 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">
                  {stock.quantity} {p.unit}
                </span>
                {stock.expiryDate ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                    isExpired ? 'bg-red-500 text-white' : 
                    isUrgent ? 'bg-orange-500 text-white animate-pulse' : 
                    'bg-emerald-500 text-white'
                  }`}>
                    {isExpired ? '🚨 Просрочен' : `⏳ до ${new Date(stock.expiryDate).toLocaleDateString()}`}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-300 uppercase italic">Срок не ограничен</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                Локация: <span className="text-slate-600 font-bold">{stock.location || 'Зона А-1'}</span>
              </div>
            </div>
          );
        })
    ) : (
      <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase italic">
        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
        Товар отсутствует на остатках
      </div>
    )}
  </div>
</td>

                    <td className="px-10 py-8 text-center align-top">
                      <div className={`text-2xl font-black ${p.totalStock > 0 ? 'text-slate-900' : 'text-rose-500 opacity-30'}`}>
                        {p.totalStock}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                        {p.unit}
                      </div>
                    </td>

                    <td className="px-10 py-8 text-right align-top">
                      <div className="flex flex-col items-end gap-4">
                        <div className="flex items-center gap-3">
                          {(userRole === 'ADMIN' || userRole === 'WAREHOUSE_WORKER') && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedProduct({ id: p.id, name: p.name });
                                  setIsModalOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black transition-all shadow-lg shadow-blue-100 uppercase"
                              >
                                Приемка (IN)
                              </button>
                              
                              <div className="flex items-center bg-rose-50 rounded-2xl p-1 border-2 border-rose-100 group-within:border-rose-400 transition-all">
                                <input
                                  type="number"
                                  min="1"
                                  value={dispatchAmounts[p.id] || ''}
                                  onChange={(e) => setDispatchAmounts({ ...dispatchAmounts, [p.id]: Number(e.target.value) })}
                                  className="w-14 bg-transparent text-center text-xs font-black outline-none text-rose-700"
                                  placeholder="1"
                                />
                                <button
                                  onClick={() => handleDispatch(p.id)}
                                  className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-rose-700 transition-colors uppercase"
                                >
                                  Списать
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-slate-300 hover:text-rose-600 p-2 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Удалить SKU
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* БЛОК ПАГИНАЦИИ */}
          <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Страница <span className="text-slate-900">{page}</span> из {totalPages}
              </span>
              <div className="h-4 w-px bg-slate-200"></div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Всего объектов: {products.length}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500 transition-all uppercase"
              >
                Назад
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500 transition-all uppercase"
              >
                Вперед
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-8 py-12 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Warehouse Management System Pro — Version 3.1.2 — 2026
        </p>
      </footer>

      {/* МОДАЛЬНОЕ ОКНО ПРИЕМКИ (STOCK IN) */}
      {isModalOpen && selectedProduct && (
        <AddStockModal
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchProducts();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;