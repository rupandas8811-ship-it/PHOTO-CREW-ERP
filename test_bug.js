const events = [{id: null}, {id: null}, {id: null}];
events.forEach((ev, evIdx) => {
    const otherEventIds = new Set(
      events
        .filter((_, oIdx) => oIdx !== evIdx)
        .flatMap((oe, oIdx) => [
          `ev_${oIdx}`
        ])
    );
    console.log(`Event ${evIdx} otherEventIds:`, Array.from(otherEventIds));
});
