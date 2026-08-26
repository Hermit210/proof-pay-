import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export function RootLayout() {
  return (
    <div className="site">
      <Navbar />
      <Outlet />
    </div>
  );
}
