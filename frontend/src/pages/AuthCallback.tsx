import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui/loading";

const AuthCallback = () => {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        navigate("/dashboard");
      } else {
        // If no session, something went wrong, go to auth
        navigate("/auth");
      }
    }
  }, [loading, session, navigate]);

  return <Loading />;
};

export default AuthCallback;