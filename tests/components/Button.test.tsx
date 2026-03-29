import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('1. Renders with children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('2. Calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('3. Has min-height of 60px (check class)', () => {
    render(<Button>Test</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('min-h-[60px]');
  });

  it('4. Disabled state prevents click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('5. Primary variant applies correct styles', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-accent');
  });

  it('6. Secondary variant applies correct styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-surface-light');
  });

  it('7. Danger variant applies correct styles', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-danger');
  });

  it('8. Ghost variant applies correct styles', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
  });

  it('9. fullWidth=true applies full width class', () => {
    render(<Button fullWidth={true}>Full</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('w-full');
  });

  it('10. fullWidth=false does not apply full width class', () => {
    render(<Button fullWidth={false}>Not Full</Button>);
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('w-full');
  });

  it('11. Custom className is applied', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  it('12. Disabled state applies opacity class', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('disabled:opacity-50');
  });
});
