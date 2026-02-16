import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, PackagePlus } from 'lucide-react';

interface Props {
  productId: string;
  productName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStockModal = ({ productId, productName, onClose, onSuccess }: Props) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Поля формы
  const [formData, setFormData] = useState({
    quantity: '',
    price: '',
    supplierId: '',
    expiryDate: ''
  });

  // 1. Загружаем поставщиков из БД при открытии
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/suppliers', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSuppliers(res.data);
      } catch (err) {
        console.error("Ошибка загрузки поставщиков:", err);
      }
    };
    fetchSuppliers();
  }, []);

  // 2. Отправка данных на бэкенд
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('http://localhost:3000/api/stock/receive', {
        productId,
        supplierId: formData.supplierId,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        expiryDate: formData.expiryDate || null
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      onSuccess(); // Обновляем список товаров в родителе
      onClose();   // Закрываем модалку
    } catch (err: any) {
      alert(err.response?.data?.message || "Ошибка при приемке");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Шапка */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <PackagePlus size={20} />
            <h3 className="font-bold">Приёмка: {productName}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Поставщик</label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.supplierId}
              onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
            >
              <option value="">-- Выберите поставщика --</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
              <input
                type="number"
                required
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена за единицу</label>
              <input
                type="number"
                required
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Срок годности (если есть)</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.expiryDate}
              onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-gray-400"
          >
            {loading ? "Обработка..." : "Добавить на склад"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;