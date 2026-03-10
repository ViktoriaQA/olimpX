import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Terminal, Trophy, BookOpen, Users, CreditCard, Shield, Lock, Star, Award } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "react-i18next";

type CardItem = {
  icon: any;
  title: string;
  desc: string;
  color: string;
  path: string;
  requiresPro?: boolean;
};

const Dashboard = () => {
  const { profile, role, loading, session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !session) navigate("/auth");
  }, [loading, session, navigate]);

  if (loading) {
    return <Loading fullScreen={false} />;
  }

  const studentCards: CardItem[] = [
    { icon: Trophy, title: t('dashboard.tournaments'), desc: t('dashboard.browseJoinTournaments'), color: "text-primary", path: "/my-tournaments" },
    { icon: BookOpen, title: t('dashboard.myProgress'), desc: t('dashboard.viewScoresHistory'), color: "text-primary", path: "/progress", requiresPro: true },
    { icon: Star, title: t('navigation.rating'), desc: t('dashboard.viewRating'), color: "text-primary", path: "/rating", requiresPro: true },
    { icon: Award, title: t('navigation.certificates'), desc: t('dashboard.viewCertificates'), color: "text-primary", path: "/certificates", requiresPro: true },
    { icon: CreditCard, title: t('dashboard.subscription'), desc: profile?.subscription_status === "active" ? t('dashboard.planActive') : t('dashboard.upgradeToCompete'), color: "text-primary", path: "/subscription" },
  ];

  const trainerCards: CardItem[] = [
    { icon: Trophy, title: t('dashboard.tournaments'), desc: t('dashboard.createManageTournaments'), color: "text-primary", path: "/my-tournaments" },
    { icon: BookOpen, title: t('dashboard.taskLibrary'), desc: t('dashboard.createBrowseTasks'), color: "text-primary", path: "/tasks" },
    { icon: Users, title: t('dashboard.students'), desc: t('dashboard.viewStudentPerformance'), color: "text-primary", path: "/students" },
    { icon: CreditCard, title: t('dashboard.subscription'), desc: profile?.subscription_status === "active" ? t('dashboard.planActive') : t('dashboard.upgradeToCreate'), color: "text-primary", path: "/subscription" },
  ];

  const adminCards: CardItem[] = [
    { icon: Shield, title: t('dashboard.adminPanel'), desc: t('dashboard.manageUsersPlatform'), color: "text-primary", path: "/admin" },
    ...trainerCards,
  ];

  const cards = role === "admin" ? adminCards : role === "trainer" ? trainerCards : studentCards;

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-mono text-primary neon-text">
          &gt; {t('dashboard.welcome')}, {profile?.nickname || "user"}_
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          {t('dashboard.role')}: <span className="text-accent">{role || "unassigned"}</span> | {t('dashboard.status')}: <span className={`cursor-pointer hover:underline ${profile?.subscription_status === "active" ? "text-primary" : "text-destructive"}`} onClick={() => navigate("/subscription")}>{profile?.subscription_status || t('dashboard.inactive')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const isDisabled = card.requiresPro && profile?.subscription_plan !== 'Pro';
          
          return (
            <div
              key={card.title}
              className={`dashboard-card rounded-lg border border-border bg-card p-6 space-y-3 transition-all duration-300 group ${
                isDisabled 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:neon-border cursor-pointer'
              }`}
              onClick={() => !isDisabled && card.path && navigate(card.path)}
            >
              <div className="flex items-start justify-between">
                <card.icon className={`w-8 h-8 ${card.color} ${!isDisabled && 'group-hover:animate-pulse-glow'}`} />
                {isDisabled && (
                  <div className="relative group/lock">
                    <Lock className="w-4 h-4 shrink-0 cursor-pointer text-muted-foreground" />
                    <div className="absolute right-full mr-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {t('navigation.requiresPro')}
                    </div>
                  </div>
                )}
              </div>
              <h3 className="font-mono font-semibold text-card-foreground">{card.title}</h3>
              <p className="text-sm text-muted-foreground font-mono">{card.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
