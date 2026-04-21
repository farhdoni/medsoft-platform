'use client';

import { useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Поиск...' }: SearchInputProps) {
  const debounced = useDebouncedCallback(onChange, 350);
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        defaultValue={value}
        onChange={(e) => debounced(e.target.value)}
        placeholder={placeholder}
        className="pl-8 w-64"
      />
    </div>
  );
}
