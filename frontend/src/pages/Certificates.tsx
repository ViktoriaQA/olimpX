import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, Calendar, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

interface Certificate {
  id: string;
  tournamentName: string;
  tournamentDate: string;
  position?: number;
  score?: number;
  totalParticipants?: number;
  issuedDate: string;
  certificateUrl?: string;
}

const Certificates = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const isPro = user?.subscription_plan === 'Pro';

  useEffect(() => {
    // TODO: Fetch certificates from API
    // For now, showing empty state
    const mockCertificates: Certificate[] = [];

    setTimeout(() => {
      setCertificates(mockCertificates);
      setLoading(false);
    }, 1000);
  }, []);

  if (!isPro) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>{t('certificates.proRequired')}</CardTitle>
            <CardDescription>
              {t('certificates.proRequiredDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <a href="/subscription">{t('certificates.upgradeToPro')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>{t('certificates.noCertificates')}</CardTitle>
            <CardDescription>
              {t('certificates.noCertificatesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline">
              <a href="/tournaments">{t('certificates.browseTournaments')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('certificates.title')}</h1>
        <p className="text-muted-foreground">{t('certificates.description')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((certificate) => (
          <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Trophy className="h-8 w-8 text-yellow-500" />
                {certificate.position && (
                  <Badge variant="secondary">
                    #{certificate.position}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{certificate.tournamentName}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(certificate.tournamentDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {certificate.score && (
                  <div className="flex justify-between text-sm">
                    <span>{t('certificates.score')}:</span>
                    <span className="font-medium">{certificate.score}%</span>
                  </div>
                )}
                {certificate.totalParticipants && (
                  <div className="flex justify-between text-sm">
                    <span>{t('certificates.participants')}:</span>
                    <span className="font-medium">{certificate.totalParticipants}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>{t('certificates.issued')}:</span>
                  <span className="font-medium">
                    {new Date(certificate.issuedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button className="w-full" asChild>
                <a href={certificate.certificateUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  {t('certificates.download')}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Certificates;
