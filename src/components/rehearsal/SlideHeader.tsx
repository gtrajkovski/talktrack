"use client";

interface SlideHeaderProps {
  currentSlide: number;
  totalSlides: number;
  title: string;
}

export function SlideHeader({ currentSlide, totalSlides, title }: SlideHeaderProps) {
  return (
    <div className="text-center mb-4">
      <div className="text-sm text-text-dim uppercase tracking-wide mb-1">
        Slide {currentSlide} of {totalSlides}
      </div>
      <h2 className="text-xl font-extrabold">{title}</h2>
    </div>
  );
}
