export const useAuthSession = () => {
  const storeSession = (data: { token: string; username: string; uuid: string; type: string }) => {
    sessionStorage.setItem("cc_api_token", data.token);
    sessionStorage.setItem("cc_username", data.username);
    sessionStorage.setItem("cc_user_uuid", data.uuid);
    sessionStorage.setItem("cc_key_type", data.type);
  };

  const clearSession = () => {
    sessionStorage.removeItem("cc_api_token");
    sessionStorage.removeItem("cc_username");
    sessionStorage.removeItem("cc_user_uuid");
    sessionStorage.removeItem("cc_key_type");
  };

  return { storeSession, clearSession };
};
