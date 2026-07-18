# TomatoDev running pace plan

TomatoDev replaces the former single running target with two season-scoped choices:

- **Manual pace:** the runner enters a target in seconds per kilometre.
- **Adaptive weekly pace:** the app establishes a comparable-distance baseline, evaluates one weekly pace check, advances only after success, and holds or relaxes the target when the evidence is weak.

This follows the product pattern documented by Garmin Run Coach: plans can use pace or heart-rate targets, take the runner's current weekly distance and average pace as inputs, and make workouts harder or easier from performance and health metrics. Garmin also documents benchmark workouts, automatic adjustment after missed work, and recovery/base work guided by heart rate rather than pace.

Official references:

- [Garmin Running Plans](https://support.garmin.com/en-US/?faq=IkvWNeIoSd48GIYCjkhlo7)
- [Garmin Run Coach target types](https://support.garmin.com/en-US/?faq=xmMRe8rjaZ3CNaINXf8dLA)
- [Garmin Coach plan adjustment](https://support.garmin.com/en-CA/?faq=o21H5a4cSU52FwFAy0R6Z5)

## TomatoDev guardrails

- Baseline: median of at least three runs from the preceding 28 days, using runs within 75–125% of the selected comparison distance.
- Progression: user-selectable 0.5%, 1%, or 1.5% after an achieved weekly check, capped at 5 seconds per kilometre per successful week.
- Recovery: the default fourth week holds the pace target.
- Load caution: progression is held when weekly distance rises more than 10% over the previous week, or when one run is more than 10% longer than the longest run in the prior 30 days. Pace and load therefore do not advance together after a material distance increase.
- Miss handling: one miss holds the target; two consecutive misses reset it toward the recent comparable-run median instead of forcing continued progression.
- Heart rate: the snapshot carries average heart rate and an optional caution threshold. Heart rate is a caution signal, not a diagnosis.

The adaptive plan is intentionally a feedback controller, not a promise of fixed linear improvement. Missing or non-comparable samples never produce a faster target.
