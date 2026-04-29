import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Home  from "./pages/Home";
import Admin from "./pages/Admin";
import Table from "./pages/Table";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"           element={<Home  />} />
            <Route path="/index.html" element={<Home  />} />
            <Route path="/admin"      element={<Admin />} />
            <Route path="/admin.html" element={<Admin />} />
            <Route path="/table"      element={<Table />} />
            <Route path="/table.html" element={<Table />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
