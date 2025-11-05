'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, FileText, FileCode, Download } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { formatBytes } from '@/lib/utils';

export default function ArtifactsPage() {
  const { artifacts } = useDashboardStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'report': return <FileText className="h-5 w-5" />;
      case 'patch': return <FileCode className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Artifacts</h1>
          <p className="text-muted-foreground mt-2">
            Generated files, reports, and patches from builds
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Artifacts ({artifacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted">
                  <div className="flex items-center space-x-4">
                    {getIcon(artifact.type)}
                    <div>
                      <p className="font-medium">{artifact.name}</p>
                      <div className="flex items-center space-x-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant="outline">{artifact.type}</Badge>
                        <span>·</span>
                        <span>{formatBytes(artifact.size)}</span>
                        <span>·</span>
                        <span>{new Date(artifact.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}

              {artifacts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No artifacts yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
