import React from 'react';
import { OnboardingActions } from './OnboardingActions';
import { OnboardingScaffold } from './OnboardingScaffold';

interface OnboardingWelcomeStepProps {
  progress: number;
  onContinue: () => void;
}

export const OnboardingWelcomeStep: React.FC<OnboardingWelcomeStepProps> = ({
  progress,
  onContinue,
}) => (
  <OnboardingScaffold
    progress={progress}
    align="center"
    titleVariant="hero"
    eyebrow="As-salamu alaikum"
    title="Welcome to Sukoon"
    subtitle="A calmer way to return to prayer, on time and with presence."
    description="We’ll set up prayer times and reminders first. Everything else can wait."
    footer={<OnboardingActions primaryLabel="Get Started" onPrimaryPress={onContinue} />}
  />
);
