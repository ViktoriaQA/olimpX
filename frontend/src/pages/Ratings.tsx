import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Medal, Award, Star, TrendingUp, Users, Crown, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RatingUser {
  id: string;
  nickname: string;
  avatar?: string;
  points: number;
  rank: number;
  solvedTasks: number;
  tournamentsWon: number;
  role: string;
  progress: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBadgeVariant = (rank: number) => {
  if (rank === 1) return "default";
  if (rank === 2) return "secondary";
  if (rank === 3) return "outline";
  return "secondary";
};

export default function Ratings() {
  const { t } = useTranslation();
  const [timeFilter, setTimeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hasData, setHasData] = useState(false); // Toggle this based on actual data from API

  // Empty state for when no data is available
  const emptyUsers: RatingUser[] = [
    { id: "1", nickname: t('ratings.noDataUser'), points: 0, rank: 1, solvedTasks: 0, tournamentsWon: 0, role: "student", progress: 0 },
    { id: "2", nickname: t('ratings.noDataUser'), points: 0, rank: 2, solvedTasks: 0, tournamentsWon: 0, role: "student", progress: 0 },
    { id: "3", nickname: t('ratings.noDataUser'), points: 0, rank: 3, solvedTasks: 0, tournamentsWon: 0, role: "student", progress: 0 },
  ];

  const users = hasData ? [] : emptyUsers;
  const currentUserRank = hasData ? 0 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            {t('ratings.title')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('ratings.description')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('ratings.allTime')}</SelectItem>
              <SelectItem value="month">{t('ratings.thisMonth')}</SelectItem>
              <SelectItem value="week">{t('ratings.thisWeek')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('ratings.allCategories')}</SelectItem>
              <SelectItem value="algorithms">{t('ratings.algorithms')}</SelectItem>
              <SelectItem value="data-structures">{t('ratings.dataStructures')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Crown className="w-5 h-5 text-yellow-400" />
              {t('ratings.topPerformer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-yellow-400">
                <AvatarFallback className="bg-gray-800 text-white font-bold">
                  {hasData ? users[0].nickname.slice(0, 2).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold font-mono text-white">{hasData ? users[0].nickname : t('ratings.noDataUser')}</p>
                <p className="text-sm text-gray-300">{users[0].points} {t('ratings.points')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {t('ratings.totalParticipants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {users.length}
            </div>
            <p className="text-sm text-gray-300">{t('ratings.activeUsers')}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-green-400" />
              {t('ratings.yourRank')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {currentUserRank > 0 ? `#${currentUserRank}` : t('ratings.noRank')}
            </div>
            <p className="text-sm text-gray-300">{currentUserRank > 0 ? t('ratings.keepClimbing') : t('ratings.startParticipating')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="top">{t('ratings.topUsers')}</TabsTrigger>
          <TabsTrigger value="tournaments">{t('ratings.tournamentWinners')}</TabsTrigger>
          <TabsTrigger value="progress">{t('ratings.mostImproved')}</TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                {t('ratings.leaderboard')}
              </CardTitle>
              <CardDescription>
                {t('ratings.leaderboardDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${
                      user.rank <= 3 ? 'bg-gradient-to-r from-gray-900 to-black border-gray-800' : 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center w-12">
                      {getRankIcon(user.rank)}
                    </div>
                    
                    <Avatar className="w-12 h-12 border-2 border-gray-600">
                      <AvatarFallback className="bg-gray-800 text-white font-mono font-bold">
                        {user.nickname.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold font-mono text-white truncate">{user.nickname}</p>
                        <Badge variant={getRankBadgeVariant(user.rank)} className="text-xs">
                          {user.rank === 1 ? t('ratings.champion') : 
                           user.rank === 2 ? t('ratings.runnerUp') : 
                           user.rank === 3 ? t('ratings.thirdPlace') : `#${user.rank}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-300">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {user.solvedTasks} {t('ratings.tasks')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {user.tournamentsWon} {t('ratings.wins')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono text-white">
                          {user.points}
                        </div>
                        <p className="text-xs text-gray-300">{t('ratings.points')}</p>
                      </div>

                      <div className="w-24">
                        <Progress value={user.progress} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-purple-600" />
                        <p className="text-xs text-gray-300 mt-1 text-center">{user.progress}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle>{t('ratings.tournamentChampions')}</CardTitle>
              <CardDescription>
                {t('ratings.tournamentChampionsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{t('ratings.comingSoon')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>{t('ratings.mostImprovedUsers')}</CardTitle>
              <CardDescription>
                {t('ratings.mostImprovedDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{t('ratings.comingSoon')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
