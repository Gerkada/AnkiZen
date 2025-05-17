
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
          <p className="mb-2">Welcome to AnkiZen! This app helps you learn and memorize anything using flashcards and a Spaced Repetition System (SRS).</p>
          <p>SRS optimizes your study schedule by showing you cards just before you're likely to forget them, making learning more efficient.</p>
        </>
      ),
    },
    {
      titleKey: 'helpDeckManagementTitle',
      content: (
        <>
          <h4 className="font-semibold mt-3 mb-1">Creating Decks:</h4>
          <p className="mb-2">Click the &quot;+ New Deck&quot; button on the main screen. Give your deck a name. You can optionally import cards from a CSV/TXT file immediately, or create an empty deck and add cards later.</p>
          <h4 className="font-semibold mt-3 mb-1">Importing Cards:</h4>
          <p className="mb-2">When creating a new deck or using the &quot;Import Words&quot; option from an existing deck&apos;s menu, you can select a CSV or TXT file. Each line in the file should be formatted as: <code>Front,Reading,Translation</code> (e.g., <code>日本,にほん,Japan</code>). Duplicates (based on the &quot;Front&quot; field) within the target deck are automatically skipped.</p>
          <h4 className="font-semibold mt-3 mb-1">Exporting Decks:</h4>
          <p className="mb-2">Open the menu for a deck and select &quot;Export Deck&quot;. This will download a CSV file of all cards in that deck.</p>
          <h4 className="font-semibold mt-3 mb-1">Renaming & Deleting Decks:</h4>
          <p className="mb-2">Use the options in each deck&apos;s menu (the three-dot icon) to rename or delete it. Deleting a deck also removes all its cards.</p>
        </>
      ),
    },
    {
      titleKey: 'helpStudyingCardsTitle',
      content: (
        <>
          <h4 className="font-semibold mt-3 mb-1">The Study Screen:</h4>
          <p className="mb-2">Click &quot;Start Studying&quot; on a deck. Cards due for review and new cards (up to your daily limit) will be presented.</p>
          <h4 className="font-semibold mt-3 mb-1">Flipping Cards & Grading:</h4>
          <p className="mb-2">Click the card or press <code>Spacebar</code> to reveal the answer. After flipping, rate your recall using the buttons: &quot;Again&quot;, &quot;Hard&quot;, &quot;Good&quot;, or &quot;Easy&quot; (or keys <code>1</code>, <code>2</code>, <code>3</code>, <code>4</code> respectively).</p>
          <h4 className="font-semibold mt-3 mb-1">Spaced Repetition System (SRS):</h4>
          <p className="mb-2">Based on your grading, AnkiZen schedules the card for future review. &quot;Again&quot; shows it soon, while &quot;Easy&quot; pushes it further out.</p>
          <h4 className="font-semibold mt-3 mb-1">Study Settings (per deck):</h4>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li><strong>Swap Front/Back:</strong> Toggle in the study screen&apos;s settings menu to change if the front or translation is shown first for that deck.</li>
            <li><strong>Shuffle Cards:</strong> Enable to shuffle the order of due and new cards in your study session.</li>
            <li><strong>New Cards Per Day:</strong> Set the maximum number of new cards you want to learn from this deck each day.</li>
          </ul>
        </>
      ),
    },
    {
      titleKey: 'helpManagingCardsTitle',
      content: (
        <>
          <p className="mb-2">Click &quot;Manage Cards&quot; on a deck to go to the Edit View. Here you can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Add New Cards:</strong> Use the &quot;Add Card&quot; button.</li>
            <li><strong>Edit Existing Cards:</strong> Click the edit icon (pencil) next to a card.</li>
            <li><strong>Delete Cards:</strong> Click the delete icon (trash can) next to a card.</li>
          </ul>
        </>
      ),
    },
     {
      titleKey: 'helpTestModeTitle',
      content: (
        <>
          <p className="mb-2">Click &quot;Take Test&quot; on a deck (requires at least 4 cards). You&apos;ll be shown a word, and you must choose the correct translation from four options. One option is correct; three are incorrect options taken from other cards in the deck.</p>
          <p className="mb-2">Your score (correct/incorrect) is tracked. If a card has a &quot;reading&quot; (like furigana), a &quot;Show Hint&quot; button may appear.</p>
        </>
      ),
    },
    {
      titleKey: 'helpStatisticsTitle',
      content: (
        <>
          <p className="mb-2">Access statistics via the settings menu in the app header. You can see:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Total number of decks and cards.</li>
            <li>Current and longest learning streaks.</li>
            <li>Interval Distribution: A graph showing how many cards are at different review intervals.</li>
            <li>Study Activity: Graphs showing your review counts per day, week, and month.</li>
          </ul>
        </>
      ),
    },
    {
      titleKey: 'helpLeechesTitle',
      content: (
        <>
          <p className="mb-2">Cards you frequently answer &quot;Again&quot; to are marked as &quot;Leeches&quot;. This means they are particularly difficult for you.</p>
          <p className="mb-2">When a card becomes a leech:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>It&apos;s temporarily suspended from normal review (its interval is set to ~6 months).</li>
            <li>You&apos;ll get a notification.</li>
            <li>In the &quot;Edit Cards&quot; view, leeches are marked with a bug icon.</li>
          </ul>
          <p className="mt-2">This helps prevent difficult cards from dominating your reviews and allows you to focus on them separately if needed (e.g., by editing or re-learning them).</p>
        </>
      ),
    },
    {
      titleKey: 'helpAppSettingsTitle',
      content: (
        <>
          <p className="mb-2">Global app settings are available in the dropdown menu (gear icon) in the header:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Theme:</strong> Switch between Light and Dark mode.</li>
            <li><strong>Language:</strong> Change the application&apos;s display language.</li>
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
