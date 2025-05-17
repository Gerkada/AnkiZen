"use client";

import type { SRSGrade } from '@/types';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageProvider';

interface StudyControlsProps {
  onGradeSelect: (grade: SRSGrade) => void;
  disabled?: boolean;
}

export default function StudyControls({ onGradeSelect, disabled = false }: StudyControlsProps) {
  const { t } = useLanguage();

  const grades: { labelKey: string; value: SRSGrade; variant?: "destructive" | "default" | "secondary" }[] = [
    { labelKey: 'again', value: 'again', variant: 'destructive' },
    { labelKey: 'hard', value: 'hard' },
    { labelKey: 'good', value: 'good' },
    { labelKey: 'easy', value: 'easy' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 w-full max-w-lg">
      {grades.map((grade) => (
        <Button
          key={grade.value}
          onClick={() => onGradeSelect(grade.value)}
          variant={grade.variant || 'default'}
          className="w-full py-3 text-base"
          disabled={disabled}
        >
          {t(grade.labelKey)}
        </Button>
      ))}
    </div>
  );
}
