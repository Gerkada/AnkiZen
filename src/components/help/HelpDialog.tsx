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
import { Sparkles } from 'lucide-react'; // Import Sparkles icon

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// A simple component to render the Sparkles icon within the text
const SparklesIcon = () => <Sparkles className="inline-block h-4 w-4 align-text-bottom" />;


export default function HelpDialog({ isOpen, onOpenChange }: HelpDialogProps) {
  const { t } = useLanguage();

  const helpSections = [
    {
      titleKey: 'helpGettingStartedTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpGettingStartedP1') }}></p>
          <p dangerouslySetInnerHTML={{ __html: t('helpGettingStartedP2') }}></p>
        </>
      ),
    },
    {
      titleKey: 'helpDeckManagementTitle',
      content: (
        <>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementCreatingTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementCreatingP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementImportingTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementImportingP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementExportingTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementExportingP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementRenamingDeletingTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpDeckManagementRenamingDeletingP1') }}></p>
        </>
      ),
    },
    {
      titleKey: 'helpMergeDecksTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpMergeDecksAccess') }}></p>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpMergeDecksDialog') }}></p>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpMergeDecksLogic') }}></p>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpMergeDecksUsecase') }}></p>
        </>
      )
    },
    {
      titleKey: 'helpStudyingCardsTitle',
      content: (
        <>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsStudyScreenTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsStudyScreenP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsFlippingGradingTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsFlippingGradingP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSRSTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSRSP1') }}></p>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsAdaptiveOrderP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsTitle') }}></h4>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsSwap') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsShuffle') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsNewPerDay') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsMaxReviews') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsInitialIntervals') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStudyingCardsSettingsLapseInterval') }}></li>
            <li>
              <strong>{t('zenModeToggle')}:</strong> {t('helpStudyingCardsSettingsZenMode').replace('<SparklesIcon/>', '<span class="icon-placeholder-sparkles"></span>')}
            </li>
          </ul>
        </>
      ),
    },
    {
      titleKey: 'helpManagingCardsTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpManagingCardsP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpManagingCardsFilteringTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpManagingCardsFilteringP1') }}></p>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsFilterSearch') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsFilterTags') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsFilterStatus') }}></li>
          </ul>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpManagingCardsActionsTitle') }}></h4>
          <ul className="list-disc pl-5 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsAddNew') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsEditExisting') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsTags') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsDelete') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpManagingCardsSuspend') }}></li>
          </ul>
        </>
      ),
    },
     {
      titleKey: 'helpTestModeTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpTestModeIntro') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigurationTitle') }}></h4>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigQuestionField')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigAnswerField')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigTestVariant')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigTestSize')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeConfigHintToggle')}}></li>
          </ul>
           <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpTestModeAnsweringTitle') }}></h4>
           <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeAnsweringMultipleChoice')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeAnsweringTypedInput')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpTestModeAnsweringTypo') }}></li>
          </ul>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpTestModeMasteryTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpTestModeMasteryP1')}}></p>
        </>
      ),
    },
    {
      titleKey: 'helpCustomStudyTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpCustomStudyP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpCustomStudyAccess') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpCustomStudyDialogTitle') }}></p>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpCustomStudyDialogTags')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpCustomStudyDialogLimit')}}></li>
          </ul>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpCustomStudyDialogStart') }}></p>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpCustomStudyIndicator') }}></p>
        </>
      ),
    },
    {
      titleKey: 'helpStatisticsTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpStatisticsP1') }}></p>
          <ul className="list-disc pl-5 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpStatisticsTotalDecksCards')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStatisticsStreaks')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStatisticsIntervalDist')}}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpStatisticsStudyActivity')}}></li>
          </ul>
        </>
      ),
    },
    {
      titleKey: 'helpLeechesTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpLeechesP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpLeechesDetectionTitle') }}></h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpLeechesDetectionP1') }}></p>
          <h4 className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: t('helpLeechesActionsTitle') }}></h4>
          <ul className="list-disc pl-5 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpLeechesActionSuspended') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpLeechesActionTag') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpLeechesActionNotification') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpLeechesActionIndicator') }}></li>
          </ul>
          <p className="mt-2" dangerouslySetInnerHTML={{ __html: t('helpLeechesP3') }}></p>
        </>
      ),
    },
    {
      titleKey: 'helpAppSettingsTitle',
      content: (
        <>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('helpAppSettingsP1') }}></p>
          <ul className="list-disc pl-5 space-y-1">
            <li dangerouslySetInnerHTML={{ __html: t('helpAppSettingsTheme') }}></li>
            <li dangerouslySetInnerHTML={{ __html: t('helpAppSettingsLanguage') }}></li>
          </ul>
        </>
      ),
    },
  ];

  // Enhanced content renderer to replace placeholders with actual icons
  const renderContent = (htmlString: string) => {
    // For now, just handle the sparkles icon. This can be expanded.
    const withSparkles = htmlString.replace(/<span class="icon-placeholder-sparkles"><\/span>/g, SparklesIcon().props.children); // A bit hacky, better would be a proper parser or different markup
    return <div dangerouslySetInnerHTML={{ __html: withSparkles }} />;
  };


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
                  {/* Check if section.content is already a ReactNode or needs t() and renderContent */}
                  {typeof section.content === 'string' ? renderContent(t(section.content)) : section.content}
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