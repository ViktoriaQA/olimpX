import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Terminal, Trophy, BookOpen, Users, CreditCard, Shield } from "lucide-react";

const Dashboard = () => {
  const { profile, role, loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse-glow text-primary font-mono">Loading...</div>
      </div>
    );
  }

  const studentCards = [
    { icon: Trophy, title: "Tournaments", desc: "Browse & join active tournaments", color: "text-primary" },
    { icon: BookOpen, title: "My Progress", desc: "View scores and attempt history", color: "text-accent" },
    { icon: CreditCard, title: "Subscription", desc: profile?.subscription_status === "active" ? "Plan active" : "Upgrade to compete", color: "text-neon-cyan" },
  ];

  const trainerCards = [
    { icon: Trophy, title: "Tournaments", desc: "Create & manage tournaments", color: "text-primary" },
    { icon: BookOpen, title: "Task Library", desc: "Create and browse tasks", color: "text-accent" },
    { icon: Users, title: "Students", desc: "View student performance", color: "text-neon-cyan" },
    { icon: CreditCard, title: "Subscription", desc: profile?.subscription_status === "active" ? "Plan active" : "Upgrade to create", color: "text-neon-green" },
  ];

  const adminCards = [
    { icon: Shield, title: "Admin Panel", desc: "Manage users and platform", color: "text-destructive" },
    ...trainerCards,
  ];

  const cards = role === "admin" ? adminCards : role === "trainer" ? trainerCards : studentCards;

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-mono text-primary neon-text">
          &gt; Welcome, {profile?.nickname || "user"}_
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          Role: <span className="text-accent">{role || "unassigned"}</span> | Status: <span className={profile?.subscription_status === "active" ? "text-primary" : "text-destructive"}>{profile?.subscription_status || "inactive"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-border bg-card p-6 space-y-3 hover:neon-border transition-all duration-300 cursor-pointer group"
          >
            <card.icon className={`w-8 h-8 ${card.color} group-hover:animate-pulse-glow`} />
            <h3 className="font-mono font-semibold text-card-foreground">{card.title}</h3>
            <p className="text-sm text-muted-foreground font-mono">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
