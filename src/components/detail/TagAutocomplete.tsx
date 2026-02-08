import { useState, useMemo, useRef, useCallback } from 'react';
import { useImageStore } from '../../store/imageStore';

type TagAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  excludeTags: string[];
};

export default function TagAutocomplete({ value, onChange, onAddTag, excludeTags }: TagAutocompleteProps) {
  const getAllTags = useImageStore((s) => s.getAllTags);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    const query = value.toLowerCase();
    return getAllTags()
      .filter((tag) => tag.toLowerCase().includes(query) && !excludeTags.some((e) => e.toLowerCase() === tag.toLowerCase()))
      .slice(0, 10);
  }, [value, getAllTags, excludeTags]);

  const handleSelect = useCallback((tag: string) => {
    onAddTag(tag);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onAddTag]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (isOpen) {
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      } else {
        onAddTag(value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setHighlightedIndex(-1);
    setIsOpen(e.target.value.trim().length > 0);
  };

  const showDropdown = isOpen && suggestions.length > 0;

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (value.trim() && suggestions.length > 0) setIsOpen(true); }}
        onBlur={() => { setTimeout(() => setIsOpen(false), 150); }}
        placeholder="Add tag..."
        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg"
        >
          {suggestions.map((tag, index) => (
            <li
              key={tag}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(tag); }}
              className={`px-2 py-1.5 text-sm cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
