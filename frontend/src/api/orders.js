import { api } from "./client";

export const listOrders = () => api.get("/orders").then((r) => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data);
export const createOrder = (o) => api.post("/orders", o).then((r) => r.data);
export const deleteOrder = (id) =>
  api.delete(`/orders/${id}`).then((r) => r.data);
