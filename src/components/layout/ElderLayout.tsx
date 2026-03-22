import { Outlet } from "react-router-dom";
import ElderChatbot from "@/components/elder/ElderChatbot";

/**
 * Layout for all elder/guardian pages. Keeps ElderChatbot mounted across
 * navigation so chat history persists while the user stays logged in.
 */
const ElderLayout = () => (
  <>
    <Outlet />
    <ElderChatbot />
  </>
);

export default ElderLayout;
