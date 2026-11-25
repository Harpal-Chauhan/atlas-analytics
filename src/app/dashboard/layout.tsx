import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return <div className="min-w-0 w-full">{children}</div>;
};

export default DashboardLayout;
