import { useAuth } from "@/hooks/useAuth";
import PublicTournaments from "./PublicTournaments";
import RegisteredTournaments from "./RegisteredTournaments";

const TournamentsAuth = () => {
  const { user } = useAuth();

  // Show public tournaments for non-authenticated users
  // Show registered tournaments for authenticated users
  return user ? <RegisteredTournaments /> : <PublicTournaments />;
};

export default TournamentsAuth;
