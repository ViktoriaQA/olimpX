import { useState, useEffect } from "react";
import { Loading } from "@/components/ui/loading";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, Calendar, Shield, CreditCard, Award, BookOpen, Trophy, TrendingUp, Edit, X, Save, Lock } from "lucide-react";
import { config } from "@/config";
import { AuthService } from "@/services/authService";
import { ProfileService, UserStats, SubscriptionInfo } from "@/services/profileService";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { user, token, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        nickname: user.nickname || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      loadUserStats();
      loadSubscriptionInfo();
    }
  }, [token]);

  const loadUserStats = async () => {
    try {
      console.log('📊 [PROFILE] Fetching user statistics...');
      console.log('👤 [PROFILE] User ID:', user?.id);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PROFILE] User stats received:', data);
        setUserStats(data);
      } else {
        console.error('❌ [PROFILE] Failed to fetch user stats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('💥 [PROFILE] Error fetching user stats:', error);
    }
  };

  const loadSubscriptionInfo = async () => {
    try {
      console.log('📋 [PROFILE] Fetching subscription information...');
      console.log('👤 [PROFILE] User ID:', user?.id);
      console.log('🔄 [PROFILE] Current subscription info:', subscriptionInfo);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/subscription`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PROFILE] Subscription info received:', data);
        console.log('🔄 [PROFILE] Subscription status change detected:', {
          oldPlan: subscriptionInfo?.plan,
          newPlan: data.plan,
          oldStatus: subscriptionInfo?.status,
          newStatus: data.status,
          oldExpires: subscriptionInfo?.expires_at,
          newExpires: data.expires_at
        });
        setSubscriptionInfo(data);
        console.log('🎯 [PROFILE] Subscription info updated in state');
      } else {
        console.error('❌ [PROFILE] Failed to fetch subscription info:', response.status, response.statusText);
        console.log('📋 [PROFILE] Setting default subscription info');
        setSubscriptionInfo({ 
          plan: 'Free', 
          status: 'inactive',
          features: [],
          expires_at: null
        });
      }
    } catch (error) {
      console.error('💥 [PROFILE] Error fetching subscription info:', error);
      console.log('📋 [PROFILE] Setting default subscription info due to error');
      setSubscriptionInfo({ 
        plan: 'Free', 
        status: 'inactive',
        features: [],
        expires_at: null
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!token) {
      console.log('❌ [PROFILE] No token available, cannot save profile');
      return;
    }

    try {
      console.log('💾 [PROFILE] Saving user profile...');
      console.log('📝 [PROFILE] Form data:', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        nickname: formData.nickname,
        email: formData.email,
        phone: formData.phone
      });
      
      setLoading(true);
      
      console.log('📡 [PROFILE] Sending profile update request...');
      await ProfileService.updateProfile({
        nickname: formData.nickname,
      });
      
      console.log('✅ [PROFILE] Profile update request successful');
      console.log('🔄 [PROFILE] Refreshing profile data...');
      await refreshProfile();
      
      setEditMode(false);
      console.log('🎉 [PROFILE] Profile saved successfully');
      
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDescription'),
      });
    } catch (error) {
      console.error('💥 [PROFILE] Error saving profile:', error);
      console.error('💥 [PROFILE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        formData
      });
      
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast({
        title: t('profile.updateError'),
        description: message,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [PROFILE] Profile save process finished');
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        nickname: user.nickname || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
    setEditMode(false);
  };

  if (!user) {
    return <Loading fullScreen={false} />;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'trainer': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      default: return 'bg-green-500/10 text-green-500 border-green-500/30';
    }
  };

  const getSubscriptionColor = (plan: string) => {
    switch (plan) {
      case 'Pro': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'Premium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const isFeatureAvailable = (feature: string) => {
    if (!subscriptionInfo) return false;
    
    const plan = subscriptionInfo.plan;
    switch (feature) {
      case 'progress':
        return plan === 'Pro' || plan === 'Premium';
      case 'tournaments':
        return true; // Available for all plans including Free
      case 'advanced_stats':
        return plan === 'Premium';
      default:
        return true;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono text-primary mb-2">{t('profile.title')}</h1>
        <p className="text-muted-foreground font-mono">{t('profile.subtitle')}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">{t('profile.info')}</TabsTrigger>
          <TabsTrigger value="subscription">{t('profile.subscription')}</TabsTrigger>
          <TabsTrigger value="activity">{t('profile.activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl font-bold">
                    {user?.nickname?.slice(0, 2).toUpperCase() ?? user?.first_name?.slice(0, 2).toUpperCase() ?? user?.email?.slice(0, 2).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="font-mono">{user?.nickname || `${user?.first_name} ${user?.last_name}`}</CardTitle>
                  <CardDescription className="font-mono">
                    {user?.email}
                  </CardDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`font-mono ${getRoleColor(user?.role || '')}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user?.role}
                    </Badge>
                    <Badge className={`font-mono ${getSubscriptionColor(subscriptionInfo?.plan || 'Free')}`}>
                      <CreditCard className="w-3 h-3 mr-1" />
                      {subscriptionInfo?.plan || 'Free'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="font-mono text-sm">{t('profile.firstName')}</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    disabled={!editMode}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="font-mono text-sm">{t('profile.lastName')}</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    disabled={!editMode}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname" className="font-mono text-sm">{t('profile.nickname')}</Label>
                  <Input
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    disabled={true}
                    className="font-mono bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-mono text-sm">{t('profile.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={true}
                    className="font-mono bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-mono text-sm">{t('profile.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!editMode}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-sm">{t('profile.registrationDate')}</Label>
                  <div className="flex items-center gap-2 text-muted-foreground font-mono">
                    <Calendar className="w-4 h-4" />
                    {new Date(user?.created_at || '').toLocaleDateString('uk-UA')}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-start sm:justify-end">
                {editMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="font-mono px-4"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                      <span className="ml-2">{t('profile.cancel')}</span>
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="font-mono px-4"
                      size="sm"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span className="ml-2">{t('profile.saving')}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span className="ml-2">{t('profile.save')}</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setEditMode(true)}
                    className="font-mono px-4"
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="ml-2">{t('profile.edit')}</span>
                  </Button>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className={`w-4 h-4 ${user?.is_verified ? 'text-green-500' : 'text-yellow-500'}`} />
                  <span className="font-mono text-sm">{t('profile.emailVerified', { status: user?.is_verified ? t('profile.verified') : t('profile.notVerified') })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className={`w-4 h-4 ${user?.phone_verified ? 'text-green-500' : 'text-yellow-500'}`} />
                  <span className="font-mono text-sm">{t('profile.phoneVerified', { status: user?.phone_verified ? t('profile.verified') : t('profile.notVerified') })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <div className="grid gap-6 max-w-2xl">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle className="font-mono flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t('profile.currentSubscription')}
                </CardTitle>
                <CardDescription className="font-mono">
                  {t('profile.activityDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{t('profile.plan')}</span>
                    <Badge className={`font-mono ${getSubscriptionColor(subscriptionInfo?.plan || 'Free')}`}>
                      {subscriptionInfo?.plan || 'Free'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{t('profile.status')}</span>
                    <Badge variant={subscriptionInfo?.status === 'active' ? 'default' : 'secondary'} className="font-mono">
                      {subscriptionInfo?.status || 'inactive'}
                    </Badge>
                  </div>
                  {subscriptionInfo?.expires_at && (
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{t('profile.expiresAt')}</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {new Date(subscriptionInfo.expires_at).toLocaleDateString('uk-UA')}
                      </span>
                    </div>
                  )}
                  {subscriptionInfo?.features && subscriptionInfo.features.length > 0 && (
                    <div className="mt-4">
                      <span className="font-mono text-sm font-medium mb-2 block">{t('profile.features')}</span>
                      <div className="flex flex-wrap gap-2">
                        {subscriptionInfo.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="font-mono text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => navigate('/subscription')}
                    className="w-full font-mono"
                  >
                    {t('profile.manageSubscription')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('profile.activityStatistics')}
                </CardTitle>
                <CardDescription className="font-mono">
                  {t('profile.activityDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <div className="text-2xl font-bold font-mono">{userStats?.tournaments_count || 0}</div>
                    <div className="text-sm text-muted-foreground font-mono">{t('profile.tournamentsCount')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold font-mono">{userStats?.tasks_count || 0}</div>
                    <div className="text-sm text-muted-foreground font-mono">{t('profile.tasksCount')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold font-mono">{userStats?.achievements_count || 0}</div>
                    <div className="text-sm text-muted-foreground font-mono">{t('profile.achievementsCount')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-mono">{t('profile.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isFeatureAvailable('progress')) {
                        navigate('/progress');
                      } else {
                        toast({
                          title: t('profile.upgradeRequired'),
                          description: t('profile.progressUpgradeDescription'),
                          action: (
                            <Button onClick={() => navigate('/subscription')} className="font-mono">
                              {t('profile.upgrade')}
                            </Button>
                          ),
                        });
                      }
                    }}
                    disabled={!subscriptionInfo}
                    className={`font-mono justify-start ${!isFeatureAvailable('progress') ? 'opacity-50' : ''}`}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t('profile.myProgress')}
                    {!isFeatureAvailable('progress') && <Lock className="w-4 h-4 ml-auto" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isFeatureAvailable('tournaments')) {
                        navigate('/my-tournaments');
                      } else {
                        toast({
                          title: t('profile.upgradeRequired'),
                          description: t('profile.tournamentsUpgradeDescription'),
                          action: (
                            <Button onClick={() => navigate('/subscription')} className="font-mono">
                              {t('profile.upgrade')}
                            </Button>
                          ),
                        });
                      }
                    }}
                    disabled={!subscriptionInfo}
                    className={`font-mono justify-start ${!isFeatureAvailable('tournaments') ? 'opacity-50' : ''}`}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    {t('profile.myTournaments')}
                    {!isFeatureAvailable('tournaments') && <Lock className="w-4 h-4 ml-auto" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
