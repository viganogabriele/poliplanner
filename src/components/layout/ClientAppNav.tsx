"use client";

import dynamic from "next/dynamic";

const AppNav = dynamic(() => import("./AppNav"), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="hidden h-screen w-60 shrink-0 border-r border-border bg-background-soft lg:block" />,
});

export default AppNav;
