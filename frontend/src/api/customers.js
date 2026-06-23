import { api } from "./client";

export const listCustomers = () => api.get("/customers").then((r) => r.data);
export const getCustomer = (id) =>
  api.get(`/customers/${id}`).then((r) => r.data);
export const createCustomer = (c) =>
  api.post("/customers", c).then((r) => r.data);
export const deleteCustomer = (id) =>
  api.delete(`/customers/${id}`).then((r) => r.data);
