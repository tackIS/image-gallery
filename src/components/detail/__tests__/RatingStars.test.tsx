import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import RatingStars from '../RatingStars';

describe('RatingStars', () => {
  it('renders 5 SVG star elements', () => {
    const { container } = render(<RatingStars rating={0} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('rating=3 renders 3 yellow and 2 gray stars', () => {
    const { container } = render(<RatingStars rating={3} />);
    const stars = container.querySelectorAll('svg');
    const yellowStars = Array.from(stars).filter((s) =>
      s.classList.contains('text-yellow-400')
    );
    const grayStars = Array.from(stars).filter((s) =>
      s.classList.contains('text-gray-600')
    );
    expect(yellowStars).toHaveLength(3);
    expect(grayStars).toHaveLength(2);
  });

  it('editable=true: click calls onChange with correct index', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RatingStars rating={2} editable onChange={onChange} />
    );
    const stars = container.querySelectorAll('svg');
    fireEvent.click(stars[3]); // 4th star → index 3 → rating 4
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('editable=false: click does not call onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RatingStars rating={2} editable={false} onChange={onChange} />
    );
    const stars = container.querySelectorAll('svg');
    fireEvent.click(stars[0]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
