import { Outlet } from "react-router";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
};

export default PublicLayout;
