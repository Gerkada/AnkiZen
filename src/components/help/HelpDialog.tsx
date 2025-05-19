
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageProvider';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function HelpDialog({ isOpen, onOpenChange }: HelpDialogProps) {
  const { t } = useLanguage();

  const helpSections = [
    {
      titleKey: 'helpGettingStartedTitle',
      content: (
        <>
          <p className="mb-2">{t('helpGettingStartedP1')}</p>
          <p>{t('helpGettingStartedP2')}</p>
        </>
      ),
    },
    {
      titleKey: 'helpDeckManagementTitle',
      content: (
        <>
          <h4 className="font-semibold mt-3 mb-1">{t('helpDeckManagementCreatingTitle')}</h4>
          <p className="mb-2">{t('helpDeckManagementCreatingP1')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpDeckManagementImportingTitle')}</h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementImportingP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpDeckManagementExportingTitle')}</h4>
          <p className="mb-2">{t('helpDeckManagementExportingP1')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpDeckManagementRenamingDeletingTitle')}</h4>
          <p className="mb-2">{t('helpDeckManagementRenamingDeletingP1')}</p>
        </>
      ),
    },
    {
      titleKey: 'helpStudyingCardsTitle',
      content: (
        <>
          <h4 className="font-semibold mt-3 mb-1">{t('helpStudyingCardsStudyScreenTitle')}</h4>
          <p className="mb-2">{t('helpStudyingCardsStudyScreenP1')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpStudyingCardsFlippingGradingTitle')}</h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsFlippingGradingP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpStudyingCardsSRSTitle')}</h4>
          <p className="mb-2">{t('helpStudyingCardsSRSP1')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpStudyingCardsSettingsTitle')}</h4>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsSwap') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsShuffle') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsNewPerDay') }}></li>
          </ul>
        </>
      ),
    },
    {
      titleKey: 'helpManagingCardsTitle',
      content: (
        <>
          <p className="mb-2">{t('helpManagingCardsP1')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsAddNew') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsEditExisting') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsDelete') }}></li>
          </ul>
        </>
      ),
    },
     {
      titleKey: 'helpTestModeTitle',
      content: (
        <>
          <p className="mb-2">{t('helpTestModeIntro')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpTestModeConfigurationTitle')}</h4>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigQuestionField')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigAnswerField')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigTestSize')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigHintToggle')}}></li>
          </ul>
          <h4 className="font-semibold mt-3 mb-1">{t('helpTestModeMasteryTitle')}</h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpTestModeMasteryP1')}}></p>
        </>
      ),
    },
    {
      titleKey: 'helpStatisticsTitle',
      content: (
        <>
          <p className="mb-2">{t('helpStatisticsP1')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('helpStatisticsTotalDecksCards')}</li>
            <li>{t('helpStatisticsStreaks')}</li>
            <li>{t('helpStatisticsIntervalDist')}</li>
            <li>{t('helpStatisticsStudyActivity')}</li>
          </ul>
        </>
      ),
    },
    {
      titleKey: 'helpLeechesTitle',
      content: (
        <>
          <p className="mb-2">{t('helpLeechesP1')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpLeechesDetectionTitle')}</h4>
          <p className="mb-2">{t('helpLeechesDetectionP1')}</p>
          <h4 className="font-semibold mt-3 mb-1">{t('helpLeechesActionsTitle')}</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('helpLeechesActionSuspended')}</li>
            <li>{t('helpLeechesActionNotification')}</li>
            <li>{t('helpLeechesActionIndicator')}</li>
          </ul>
          <p className="mt-2">{t('helpLeechesP3')}</p>
        </>
      ),
    },
    {
      titleKey: 'helpAppSettingsTitle',
      content: (
        <>
          <p className="mb-2">{t('helpAppSettingsP1')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpAppSettingsTheme') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpAppSettingsLanguage') }}></li>
          </ul>
        </>
      ),
    },
  ];


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('helpTitle')}</DialogTitle>
          <DialogDescription>
            {t('helpDescription')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <Accordion type="single" collapsible className="w-full">
            {helpSections.map((section, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>{t(section.titleKey)}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground prose prose-sm max-w-none">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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

