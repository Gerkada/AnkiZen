
"use client";

import { useState, type ChangeEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useToast } from '@/hooks/use-toast';

interface CreateDeckDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function CreateDeckDialog({ isOpen, onOpenChange }: CreateDeckDialogProps) {
  const [deckName, setDeckName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const { addDeck, importCardsToDeck } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      };
      reader.readAsText(file);
    } else {
      setFileName('');
      setFileContent('');
    }
  };

  const handleSubmit = () => {
    if (!deckName.trim()) {
      toast({ title: "Error", description: "Deck name cannot be empty.", variant: "destructive" });
      return;
    }

    const newDeck = addDeck(deckName);
    
    if (fileContent.trim()) {
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');
      const parsedCards = lines.map(line => {
        const parts = line.split(',');
        return {
          front: parts[0]?.trim() || '',
          reading: parts[1]?.trim() || '',
          translation: parts[2]?.trim() || '',
        };
      }).filter(card => card.front); // Ensure front is not empty

      if (parsedCards.length > 0) {
        importCardsToDeck(newDeck.id, parsedCards);
        toast({ title: "Success", description: t('deckCreatedWithCards', { deckName: newDeck.name, count: parsedCards.length }) });
      } else {
        toast({ title: "Success", description: t('deckCreatedNoValidCards', { deckName: newDeck.name }) });
      }
    } else {
      toast({ title: "Success", description: t('deckCreated', { deckName: newDeck.name }) });
    }

    setDeckName('');
    setFileContent('');
    setFileName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('newDeck')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deck-name" className="text-right">
              {t('deckName')}
            </Label>
            <Input
              id="deck-name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="col-span-3"
              placeholder={t('deckName')}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="card-file" className="text-right col-span-4 text-left mb-[-0.5rem] font-semibold">
              {t('optionalImportTitle')}
            </Label>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 mt-1">
            <Label htmlFor="card-file" className="text-right sr-only"> {/* Visually hidden, but good for accessibility */}
              {t('optionalImportTitle')}
            </Label>
            <div className="col-span-4">
               <Input id="card-file" type="file" accept=".csv,.txt" onChange={handleFileChange} className="mb-1" />
               {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground px-2">
            {t('importInstructions')}
          </DialogDescription>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>{t('createDeck')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
