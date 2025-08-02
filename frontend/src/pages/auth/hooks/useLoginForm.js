import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import { login as apiLogin } from "../../../api/auth";

export function useLoginForm() {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const handleLogin = async (username, password) => {
        setLoading(true);
        setErrorMsg("");

        try {
            const data = await apiLogin(username, password);
            console.log("📥 Login API response:", data);

            const {
                access_token,
                restaurant_id,
                subscription_tier,
                name,
                employee_id,
                role_id,
                preferences,
            } = data;

            if (!access_token || !restaurant_id || !subscription_tier || role_id === undefined) {
                throw new Error("Invalid login response format");
            }

            // Pass preferences down to context login!
            login({
                token: access_token,
                tier: subscription_tier,
                user: {
                    username,
                    name,
                    restaurant_id,
                    employee_id,
                    role_id,
                    preferences, 
                },
                preferences,
            });

            console.log("✅ Successfully logged in, redirecting...");
            navigate("/dashboard/daily-overview");
        } catch (err) {
            console.error("❌ Login failed:", err);
            setErrorMsg(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return { handleLogin, loading, errorMsg };
}
