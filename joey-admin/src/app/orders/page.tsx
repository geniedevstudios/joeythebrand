"use client";

import { useEffect, useState } from "react";
import { dataStore } from "@/lib/dataStore";
import type { Order, OrderStatus } from "@/lib/types";
import { PackageOpen } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(dataStore.getOrders());
    const unsubscribe = dataStore.subscribe(() => {
      setOrders(dataStore.getOrders());
    });
    return unsubscribe;
  }, []);

  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    dataStore.updateOrderStatus(id, newStatus);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-zinc-100 text-zinc-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Orders</h1>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-zinc-200">
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <PackageOpen className="mx-auto h-12 w-12 text-zinc-300" />
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">No Orders Expected</h3>
              <p className="mt-1 text-sm text-zinc-500">You haven't received any orders yet.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Order ID & Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Items & Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-zinc-900">{order.id}</div>
                      <div className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-zinc-900">{order.customerName}</div>
                      <div className="text-xs text-zinc-500">{order.customerEmail}</div>
                      <div className="text-xs text-zinc-500">{order.shippingAddress}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-zinc-900 font-medium">$\{(order.total / 100).toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">{order.items.length} items</div>
                      {order.promotionCode && (
                        <div className="text-xs text-green-600 mt-1">
                          Promo: {order.promotionCode} (-$\{(order.discount / 100).toFixed(2)})
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(order.status)} capitalize`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 sm:text-sm rounded-md shadow-sm border"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
