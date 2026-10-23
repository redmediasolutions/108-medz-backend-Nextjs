import { ordersRepository } from "@/features/orders/repository/orders.repository";

/** Pincode analytics reads the same sources as Orders: WooCommerce (all orders) + Firebase (app orders). */
export const pincodesRepository = {
  wooInRange: (after?: string, fresh?: boolean) => ordersRepository.wooAll({ after, fresh }),
  appSince: ordersRepository.appSince,
  wooSearch: (term: string) => ordersRepository.wooList({ search: term, perPage: 100 }),
  appByPincode: ordersRepository.appByPincode,
};
