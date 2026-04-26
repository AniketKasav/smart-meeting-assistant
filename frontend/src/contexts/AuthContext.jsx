import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const res = await axios.get(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = res.data;
        setUser({ ...userData, userId: userData._id?.toString() });
      } catch (error) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
    setLoading(false);
  };

  const register = async (email, password, name) => {
    const res = await axios.post(`${API_URL}/register`, {
      email,
      password,
      name,
    });
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    const u = res.data.user;
    setUser({ ...u, userId: u._id?.toString() || u.id?.toString() });
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    const u = res.data.user;
    setUser({ ...u, userId: u._id?.toString() || u.id?.toString() });
    return res.data;
  };

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await axios.post(
          `${API_URL}/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
      window.location.href = "/login";
    }
  }, [API_URL]);

  const updateProfile = async (name) => {
    const token = localStorage.getItem("accessToken");
    const res = await axios.put(
      `${API_URL}/profile`,
      { name },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const userData = res.data;
    setUser({ ...userData, userId: userData._id?.toString() });
    return res.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const token = localStorage.getItem("accessToken");
    await axios.post(
      `${API_URL}/change-password`,
      { currentPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  };

  const getToken = () => localStorage.getItem("accessToken");

  const getMeetingRole = useCallback(
    (meeting) => {
      if (!meeting || !user) return null;
      if (meeting.host?.userId === user.userId) return "host";
      const participant = meeting.participants?.find(
        (p) => p.userId === user.userId,
      );
      return participant ? "member" : null;
    },
    [user],
  );

  const isHostOf = useCallback(
    (meeting) => {
      return getMeetingRole(meeting) === "host";
    },
    [getMeetingRole],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        updateProfile,
        changePassword,
        isAuthenticated: !!user,
        getToken,
        getMeetingRole,
        isHostOf,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
