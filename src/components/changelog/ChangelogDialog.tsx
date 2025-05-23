
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageProvider';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChangelogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface ChangelogEntry {
  version: string;
  changes: string[]; 
}

export default function ChangelogDialog({ isOpen, onOpenChange }: ChangelogDialogProps) {
  const { t } = useLanguage();

  const changelogData: ChangelogEntry[] = [
     {
      version: t('changelogVersion_1_4_0'), // "1.4.0 (Current)"
      changes: [
        'changelog_1_4_0_zenMode',
      ],
    },
    {
      version: t('changelogVersion_1_3_0'), 
      changes: [
        'changelog_1_3_0_cardFiltersEditView',
        'changelog_1_3_0_cardNotes',
        'changelog_1_3_0_mergeDecks',
      ],
    },
    {
      version: t('changelogVersion_1_2_0'), 
      changes: [
        'changelog_1_2_0_helpUpdate',
        'changelog_1_2_0_changelogFeature',
        'changelog_1_2_0_adaptiveOrder',
        'changelog_1_2_0_customStudyTags',
        'changelog_1_2_0_typoToleranceTest',
        'changelog_1_2_0_leechTagging',
        'changelog_1_2_0_lapseInterval',
      ],
    },
    {
      version: t('changelogVersion_1_1_0'),
      changes: [
        'changelog_1_1_0_suspendCards',
        'changelog_1_1_0_advancedSrsSettings',
        'changelog_1_1_0_testModeVariants',
        'changelog_1_1_0_testModeSize',
        'changelog_1_1_0_masteryChallenge',
        'changelog_1_1_0_studyActivityGraphs',
      ],
    },
    {
      version: t('changelogVersion_1_0_0'),
      changes: [
        'changelog_1_0_0_initialRelease',
        'changelog_1_0_0_deckManagement',
        'changelog_1_0_0_cardStudySrs',
        'changelog_1_0_0_cardEditing',
        'changelog_1_0_0_importExport',
        'changelog_1_0_0_basicTestMode',
        'changelog_1_0_0_statisticsPage',
        'changelog_1_0_0_leechDetection',
        'changelog_1_0_0_i18n',
        'changelog_1_0_0_themeToggle',
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('changelogTitle')}</DialogTitle>
          <DialogDescription>
            {t('changelogDescription')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-6">
            {changelogData.map((entry, index) => (
              <div key={index}>
                <h3 className="font-semibold text-lg mb-1">{entry.version}</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {entry.changes.map((changeKey, cIndex) => (
                    <li key={cIndex} dangerouslySetInnerHTML={{ __html: t(changeKey) }}></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
