import { useCallback, useRef, useState } from "react";

import { getRecommendedForCharge } from "../api/recommended";

// The recommended playlist covering a charge, fetched on demand.
//
// The lookup is deliberately not tied to a category <select> changing: that
// control gets scrubbed, and most passes through it never end with anyone
// opening the playlist modal. `load` is called when the modal opens instead, so
// a charge costs at most one request however many times it is passed over.
//
// Answers are cached per charge for the life of the screen, the `null` that
// means "nothing curated for this charge yet" included -- that is a real answer,
// not a miss, and re-asking it on every reopen would be wasted.

const useRecommendedPlaylist = (token) => {
  const [recommended, setRecommended] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const cacheRef = useRef(new Map());
  // The charge the screen is currently waiting on. Reopening the modal under a
  // different category makes any in-flight response stale.
  const pendingChargeRef = useRef("");

  const load = useCallback(
    async (charge) => {
      setError("");
      // Cleared up front so a previous charge's set is never shown under a new
      // one while the new answer is still on its way.
      setRecommended(null);
      pendingChargeRef.current = charge || "";

      if (!charge || !token) return;

      const cache = cacheRef.current;
      if (cache.has(charge)) {
        setRecommended(cache.get(charge));
        return;
      }

      setIsLoading(true);

      try {
        const found = await getRecommendedForCharge(charge, token);
        cache.set(charge, found);
        if (pendingChargeRef.current !== charge) return;
        setRecommended(found);
      } catch (requestError) {
        if (pendingChargeRef.current !== charge) return;
        // Held apart from the screen's own error state so a failed lookup
        // leaves the user's own playlists listed and still loadable.
        setError(
          requestError?.response?.data?.message ||
            "Unable to load the recommended playlist.",
        );
      } finally {
        if (pendingChargeRef.current === charge) setIsLoading(false);
      }
    },
    [token],
  );

  return { recommended, isLoading, error, load };
};

export default useRecommendedPlaylist;
