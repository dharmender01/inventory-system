import axios from "axios";

const baseURL = (
  import.meta.env.REACT_APP_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export function apiError(err, fallback = "Something went wrong") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        const field = Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "";
        return field ? `${field}: ${e.msg}` : e.msg;
      })
      .join("; ");
  }
  if (typeof detail === "string") return detail;
  return err?.message || fallback;
}
