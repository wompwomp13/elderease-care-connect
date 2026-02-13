import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export const ThemeFromRoute = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (pathname.startsWith("/admin")) {
      root.setAttribute("data-theme", "admin");
    } else if (pathname.startsWith("/elder")) {
      root.setAttribute("data-theme", "guardian");
    } else if (pathname.startsWith("/companion")) {
      root.setAttribute("data-theme", "volunteer");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [pathname]);

  return null;
};
