import { queryClient } from "@/services/queryClient";

export function clearUserSession() {
  sessionStorage.removeItem("cc_api_token");
  sessionStorage.removeItem("cc_user_uuid");
  sessionStorage.removeItem("cc_username");
  sessionStorage.removeItem("cc_key_type");
  sessionStorage.removeItem("cc_view");
  queryClient.clear();
}
