import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, User, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "trainer" | null>(null);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkNickname = async (value: string) => {
    if (value.length < 3) {
      setNicknameAvailable(null);
      return;
    }
    setChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("nickname", value)
      .maybeSingle();
    setNicknameAvailable(!data);
    setChecking(false);
  };

  const handleNicknameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setNickname(sanitized);
    checkNickname(sanitized);
  };

  const handleSubmit = async () => {
    if (!user || !selectedRole || !nicknameAvailable || nickname.length < 3) return;
    setSubmitting(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ nickname, onboarded: true })
      .eq("user_id", user.id);

    if (profileError) {
      toast.error("Failed to update profile");
      setSubmitting(false);
      return;
    }

    const { error: roleError } = await supabase
      .from("custom_users")
      .update({ role: selectedRole })
      .eq("id", user.id);

    if (roleError) {
      toast.error("Failed to assign role");
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    toast.success("Welcome to CodeArena!");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background matrix-bg">
      <div className="w-full max-w-lg p-8 space-y-8">
        <div className="text-center space-y-2">
          <Terminal className="w-8 h-8 text-primary mx-auto" />
          <h1 className="text-2xl font-bold font-mono text-primary">
            Setup Profile
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            &gt; configure --nickname --role_
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-6 neon-border">
          {/* Nickname */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground">
              <span className="text-primary">$</span> nickname
            </label>
            <Input
              value={nickname}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder="your_unique_handle"
              className="font-mono bg-background border-border focus:border-primary"
              maxLength={20}
            />
            {nickname.length >= 3 && (
              <p className={`text-xs font-mono ${nicknameAvailable ? "text-primary" : "text-destructive"}`}>
                {checking ? "checking..." : nicknameAvailable ? "✓ available" : "✗ taken"}
              </p>
            )}
            {nickname.length > 0 && nickname.length < 3 && (
              <p className="text-xs font-mono text-muted-foreground">min 3 characters</p>
            )}
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground">
              <span className="text-primary">$</span> select role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedRole("student")}
                className={`p-4 rounded-lg border transition-all duration-200 font-mono text-sm flex flex-col items-center gap-2 ${
                  selectedRole === "student"
                    ? "border-primary bg-primary/10 text-primary neon-glow"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <GraduationCap className="w-6 h-6" />
                Student
              </button>
              <button
                onClick={() => setSelectedRole("trainer")}
                className={`p-4 rounded-lg border transition-all duration-200 font-mono text-sm flex flex-col items-center gap-2 ${
                  selectedRole === "trainer"
                    ? "border-accent bg-accent/10 text-accent neon-glow"
                    : "border-border bg-background text-muted-foreground hover:border-accent/50"
                }`}
              >
                <User className="w-6 h-6" />
                Trainer
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || !nicknameAvailable || nickname.length < 3 || submitting}
            className="w-full font-mono bg-primary text-primary-foreground hover:bg-primary/80 neon-glow"
          >
            {submitting ? "Initializing..." : "$ init --profile"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
