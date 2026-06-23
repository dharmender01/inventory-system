import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#0F172A",
              color: "#fff",
              fontSize: "14px",
              borderRadius: "10px",
              padding: "10px 14px",
              boxShadow: "0 10px 30px -10px rgba(15,23,42,0.5)",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#0F172A" } },
            error: {
              duration: 4500,
              iconTheme: { primary: "#F87171", secondary: "#0F172A" },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
