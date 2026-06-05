// useMeaningPromptEligibility — drives the 5-day invite prompt.
//
// Consumers (typically MeaningInvitePrompt) read `shouldShow` to decide
// whether to render. When the user answers, the appropriate preference
// is set on MeaningsService and `shouldShow` flips to false for the
// remainder of the session.
//
// The hook is intentionally a passive observer — it does NOT
// automatically mark the prompt as shown on mount. The prompt component
// calls markShown() explicitly when it has actually rendered, so
// declined-and-never-displayed prompts don't burn through the user's
// MAX_PROMPTS_PER_USER cap.

import { useCallback, useEffect, useState } from 'react';
import MeaningsService from '../services/MeaningsService';
import type { PromptAnswer } from '../content/schema';

export interface UseMeaningPromptEligibilityResult {
  shouldShow: boolean;
  markShown: () => void;
  onAnswer: (choice: PromptAnswer) => void;
  onDismiss: () => void;
}

export const useMeaningPromptEligibility = (): UseMeaningPromptEligibilityResult => {
  const [shouldShow, setShouldShow] = useState(() =>
    MeaningsService.shouldShowPrompt(),
  );

  useEffect(() => {
    const unsubscribe = MeaningsService.subscribe(() => {
      setShouldShow(MeaningsService.shouldShowPrompt());
    });
    setShouldShow(MeaningsService.shouldShowPrompt());
    return unsubscribe;
  }, []);

  const markShown = useCallback(() => {
    MeaningsService.markPromptShown();
  }, []);

  const onAnswer = useCallback((choice: PromptAnswer) => {
    if (choice === 'yes') {
      MeaningsService.setPreference('opted_in', 'prompt');
    } else if (choice === 'later') {
      MeaningsService.setPreference('declined', 'prompt');
    } else {
      MeaningsService.setPreference('knows_meanings', 'prompt');
    }
    setShouldShow(false);
  }, []);

  const onDismiss = useCallback(() => {
    MeaningsService.markPromptDismissed();
    setShouldShow(false);
  }, []);

  return { shouldShow, markShown, onAnswer, onDismiss };
};
