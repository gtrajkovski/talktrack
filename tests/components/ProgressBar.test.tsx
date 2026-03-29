import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  it('1. Renders with value 50 → width is ~50%', () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar?.getAttribute('style')).toContain('50%');
  });

  it('2. Renders with value 0 → minimal width', () => {
    const { container } = render(<ProgressBar value={0} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar?.getAttribute('style')).toContain('0%');
  });

  it('3. Renders with value 100 → full width', () => {
    const { container } = render(<ProgressBar value={100} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar?.getAttribute('style')).toContain('100%');
  });

  it('4. Clamps value above 100 to 100%', () => {
    const { container } = render(<ProgressBar value={150} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar?.getAttribute('style')).toContain('100%');
  });

  it('5. Clamps value below 0 to 0%', () => {
    const { container } = render(<ProgressBar value={-50} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar?.getAttribute('style')).toContain('0%');
  });

  it('6. Shows label when showLabel=true', () => {
    render(<ProgressBar value={50} showLabel={true} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
