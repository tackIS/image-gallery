import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type BreadcrumbItem = {
  label: string;
  path?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={14}
                className="text-gray-400 dark:text-gray-500 flex-shrink-0"
              />
            )}
            {isLast || !item.path ? (
              <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(item.path!)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-1"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
