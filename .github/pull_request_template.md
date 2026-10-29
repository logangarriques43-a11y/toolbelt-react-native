## What and why


## Checklist
- [ ] Did this PR copy a block from another store or screen? If so, should it be one helper in `src/lib/`?
- [ ] Any new `.catch(() => {})` or empty `catch`? Can a failure leave the UI claiming success, or grant a role?
- [ ] New query key or AsyncStorage key: does it include the uid, or is it listed in `src/lib/user-data-keys.ts`?
- [ ] Any hardcoded colors, font sizes or URLs?
- [ ] Phone numbers normalized before sending?
- [ ] Did a baseline in `scripts/weed-ratchet.sh` go **up**? It shouldn't.
- [ ] Tested on a dev build, not Expo Go?
